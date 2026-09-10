import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";

const measuredRequests = new Counter("measured_requests");
const measuredFailures = new Rate("measured_failures");
const measuredDuration = new Trend("measured_duration", true);

const endpointTrends = {
  cost_summary: new Trend("endpoint_cost_summary_duration", true),
  cost_timeseries: new Trend("endpoint_cost_timeseries_duration", true),
  cost_by_service: new Trend("endpoint_cost_by_service_duration", true),
  aws_account_list: new Trend("endpoint_aws_account_list_duration", true),
  sync_history: new Trend("endpoint_sync_history_duration", true),
};

const requiredEnvironment = ["BASE_URL", "TEST_EMAIL", "TEST_PASSWORD", "WORKSPACE_ID"];

export const assertEnvironment = () => {
  for (const name of requiredEnvironment) {
    if (!__ENV[name]) {
      throw new Error(`${name} is required`);
    }
  }
  if (!/^https?:\/\//.test(__ENV.BASE_URL)) {
    throw new Error("BASE_URL must start with http:// or https://");
  }
};

export const standardThresholds = (failureThreshold = "rate<0.01", abortOnFailure = false) => ({
  measured_failures: abortOnFailure
    ? [{ threshold: failureThreshold, abortOnFail: true, delayAbortEval: "30s" }]
    : [failureThreshold],
  measured_duration: ["p(95)<200", "p(99)<500"],
  checks: ["rate>0.99"],
  endpoint_cost_summary_duration: ["p(95)<200", "p(99)<500"],
  endpoint_cost_timeseries_duration: ["p(95)<200", "p(99)<500"],
  endpoint_cost_by_service_duration: ["p(95)<200", "p(99)<500"],
  endpoint_aws_account_list_duration: ["p(95)<200", "p(99)<500"],
  endpoint_sync_history_duration: ["p(95)<200", "p(99)<500"],
});

export const authenticate = () => {
  assertEnvironment();
  const response = http.post(
    `${__ENV.BASE_URL}/api/v1/auth/mobile/login`,
    JSON.stringify({ email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASSWORD }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "auth_setup", scope: "setup" },
    },
  );

  if (response.status !== 200) {
    throw new Error(`Authentication failed with HTTP ${response.status}`);
  }

  let payload;
  try {
    payload = response.json();
  } catch (_error) {
    throw new Error("Authentication returned invalid JSON");
  }

  const accessToken = payload?.tokens?.accessToken;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error("Authentication response did not contain an access token");
  }

  return { accessToken };
};

const requestDefinitions = [
  {
    upperBound: 30,
    name: "cost_summary",
    path: `/api/v1/workspaces/${__ENV.WORKSPACE_ID}/costs/summary?from=2025-01-01&to=2025-12-31`,
    shape: (body) => typeof body?.summary?.totalAmount === "number" && body.summary.currency === "USD",
  },
  {
    upperBound: 60,
    name: "cost_timeseries",
    path: `/api/v1/workspaces/${__ENV.WORKSPACE_ID}/costs/timeseries?from=2025-01-01&to=2025-12-31`,
    shape: (body) => Array.isArray(body?.points) && body.points.length === 365,
  },
  {
    upperBound: 85,
    name: "cost_by_service",
    path: `/api/v1/workspaces/${__ENV.WORKSPACE_ID}/costs/by-service?from=2025-01-01&to=2025-12-31`,
    shape: (body) => Array.isArray(body?.services) && body.services.length === 50,
  },
  {
    upperBound: 95,
    name: "aws_account_list",
    path: `/api/v1/workspaces/${__ENV.WORKSPACE_ID}/aws-accounts`,
    shape: (body) => Array.isArray(body?.awsAccounts) && body.awsAccounts.length === 20,
  },
  {
    upperBound: 100,
    name: "sync_history",
    path: `/api/v1/workspaces/${__ENV.WORKSPACE_ID}/sync-history?limit=25`,
    shape: (body) => Array.isArray(body?.syncRuns) && body.syncRuns.length > 0,
  },
];

const chooseRequest = () => {
  // Multiplication by a value coprime to 100 deterministically spreads short
  // runs across the complete weighted distribution instead of exhausting each
  // endpoint's contiguous bucket in order.
  const bucket = (exec.scenario.iterationInTest * 37) % 100;
  return requestDefinitions.find((definition) => bucket < definition.upperBound);
};

export const runMeasuredRequest = (data) => {
  const definition = chooseRequest();
  if (!definition) {
    throw new Error("No request definition selected");
  }

  const response = http.get(`${__ENV.BASE_URL}${definition.path}`, {
    headers: {
      Authorization: `Bearer ${data.accessToken}`,
      Accept: "application/json",
    },
    tags: { name: definition.name, endpoint: definition.name, scope: "measured" },
  });

  let body = null;
  let validJson = true;
  try {
    body = response.json();
  } catch (_error) {
    validJson = false;
  }

  const validStatus = response.status === 200;
  const validShape = validJson && definition.shape(body);
  const passed = check(response, {
    [`${definition.name}: status is 200`]: () => validStatus,
    [`${definition.name}: response is JSON`]: () => validJson,
    [`${definition.name}: response shape is valid`]: () => validShape,
    [`${definition.name}: no auth or server error`]: () =>
      response.status !== 401 && response.status !== 403 && response.status < 500,
  });

  measuredRequests.add(1);
  measuredFailures.add(!passed || !validStatus || !validJson || !validShape);
  measuredDuration.add(response.timings.duration);
  endpointTrends[definition.name].add(response.timings.duration);
  sleep(Number(__ENV.THINK_TIME_SECONDS ?? "0.1"));
};

export const writeSummary = (data, defaultName) => {
  const resultsDirectory = (__ENV.RESULTS_DIR ?? "results").replace(/[\\/]$/, "");
  const summaryName = __ENV.SUMMARY_NAME ?? defaultName;
  return {
    [`${resultsDirectory}/${summaryName}`]: JSON.stringify(data, null, 2),
    stdout: `Saved compact k6 summary to ${resultsDirectory}/${summaryName}\n`,
  };
};
