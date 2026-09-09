# Underflow API benchmark results

> This template intentionally contains no performance claims. Generate the completed file from captured summaries with `scripts/generate-results.sh`.

## Objective

Measure authenticated, PostgreSQL-backed cost-reporting reads on the documented disposable AWS configuration.

## Tested commit

See `environment.json`.

## Infrastructure

See `environment.json`. Results apply only to the documented one-task ECS and single-AZ RDS configuration.

## Dataset

See `dataset.json` for exact verified counts.

## Workload

30% summary, 30% timeseries, 25% by service, 10% AWS account list, and 5% sync history. Authentication occurs before measurement; every measured request still uses bearer authentication and performs the application's PostgreSQL user lookup.

## Thresholds

Measured failure rate `< 1%`, measured request latency p95 `< 200 ms`, p99 `< 500 ms`, and checks pass rate `> 99%`.

## Results

Generated from `smoke-summary.json`, `load-summary.json`, and, when safely run, `stress-summary.json`.

## Per-endpoint results

Generated from named endpoint trend metrics.

## AWS resource metrics

See `cloudwatch-summary.json`.

## Observed bottlenecks

Record only observations supported by k6 and CloudWatch evidence.

## Limitations

Synthetic data, one region, one Fargate task, one load-generator location, HTTP restricted by CIDR, and a single-AZ burstable RDS instance.

## Reproduction commands

See [`README.md`](README.md).

## Evidence-backed résumé bullet

Generated mechanically only after a completed normal-load run.
