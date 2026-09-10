import { authenticate, runMeasuredRequest, standardThresholds, writeSummary } from "./common.js";

const capacityVus = Number(__ENV.CAPACITY_VUS ?? "5");
if (!Number.isInteger(capacityVus) || capacityVus < 1 || capacityVus > 100) {
  throw new Error("CAPACITY_VUS must be an integer from 1 through 100");
}

const capacityDuration = __ENV.CAPACITY_DURATION ?? "3m";

export const options = {
  scenarios: {
    capacity: {
      executor: "constant-vus",
      vus: capacityVus,
      duration: capacityDuration,
      gracefulStop: "30s",
    },
  },
  // Abort sustained functional failures so a changed public IP does not turn
  // the remainder of a capacity run into misleading fast failures.
  thresholds: standardThresholds("rate<0.01", true),
};

export const setup = authenticate;

export default runMeasuredRequest;

export const handleSummary = (data) =>
  writeSummary(data, `capacity-${capacityVus}vus-summary.json`);
