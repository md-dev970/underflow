import { authenticate, runMeasuredRequest, standardThresholds, writeSummary } from "./common.js";

export const options = {
  scenarios: {
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      gracefulRampDown: "15s",
      stages: [
        { duration: "2m", target: 100 },
        { duration: "3m", target: 100 },
        { duration: "1m", target: 150 },
        { duration: "3m", target: 150 },
        { duration: "1m", target: 200 },
        { duration: "3m", target: 200 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: standardThresholds("rate<0.05", true),
};

export const setup = authenticate;

export default runMeasuredRequest;

export const handleSummary = (data) => writeSummary(data, "stress-summary.json");
