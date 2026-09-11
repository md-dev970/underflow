import { authenticate, runMeasuredRequest, standardThresholds, writeSummary } from "./common.js";

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: Number(__ENV.SMOKE_VUS ?? "2"),
      duration: __ENV.SMOKE_DURATION ?? "30s",
    },
  },
  thresholds: standardThresholds(),
};

export const setup = authenticate;

export default runMeasuredRequest;

export const handleSummary = (data) => writeSummary(data, "smoke-summary.json");
