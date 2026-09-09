import { authenticate, runMeasuredRequest, standardThresholds, writeSummary } from "./common.js";

export const options = {
  scenarios: {
    normal_load: {
      executor: "ramping-vus",
      startVUs: 0,
      gracefulRampDown: "30s",
      stages: [
        { duration: "1m", target: 25 },
        { duration: "3m", target: 25 },
        { duration: "1m", target: 50 },
        { duration: "5m", target: 50 },
        { duration: "2m", target: 100 },
        { duration: "5m", target: 100 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: standardThresholds(),
};

export const setup = authenticate;

export default runMeasuredRequest;

export const handleSummary = (data) => writeSummary(data, "load-summary.json");
