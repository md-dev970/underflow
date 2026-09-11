#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 K6_SUMMARY CLOUDWATCH_SUMMARY" >&2
  exit 2
fi

K6_SUMMARY="$1"
CLOUDWATCH_SUMMARY="$2"

for command in jq; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "$command is required" >&2
    exit 2
  }
done

[[ -f "$K6_SUMMARY" ]] || { echo "missing k6 summary: $K6_SUMMARY" >&2; exit 2; }
[[ -f "$CLOUDWATCH_SUMMARY" ]] || { echo "missing CloudWatch summary: $CLOUDWATCH_SUMMARY" >&2; exit 2; }

jq -e '
  .metrics.measured_failures.values.rate < 0.01 and
  .metrics.checks.values.rate > 0.99
' "$K6_SUMMARY" >/dev/null || {
  echo "FAIL: functional thresholds were not met" >&2
  exit 1
}

jq -e '
  .metrics.alb_target_response.datapoints as $points |
  ($points | length) > 0 and
  all($points[];
    .ExtendedStatistics.p50 < 0.030 and
    .ExtendedStatistics.p95 < 0.100 and
    .ExtendedStatistics.p99 < 0.250
  )
' "$CLOUDWATCH_SUMMARY" >/dev/null || {
  echo "FAIL: ALB server-side targets were not met in every one-minute datapoint" >&2
  exit 1
}

jq -r '
  .metrics.alb_target_response.datapoints |
  "PASS: \(length) datapoints; worst p50=\(map(.ExtendedStatistics.p50) | max * 1000) ms, p95=\(map(.ExtendedStatistics.p95) | max * 1000) ms, p99=\(map(.ExtendedStatistics.p99) | max * 1000) ms"
' "$CLOUDWATCH_SUMMARY"
