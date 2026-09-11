# Underflow API benchmark results

## Objective

Measure authenticated, PostgreSQL-backed cost-reporting reads on an isolated, disposable AWS configuration and establish a repeatable server-side capacity boundary.

## Tested commit

API commit `2624a6ccafc427521745b1180764fcde963f90bc` using image digest `sha256:b1eec7b5c7652dfab0fe8259ab66f9b0682e228930da769c8d1688961680e644`.

## Infrastructure

One ECS Fargate API task with 0.5 vCPU and 1,024 MiB memory, backed by a private, single-AZ `db.t4g.micro` PostgreSQL 16.13 instance with 20 GiB encrypted storage in `us-east-1`.

## Dataset

3,650,000 deterministic synthetic cost snapshots across 10 workspaces and 200 synthetic AWS accounts. Workspace/date/service reads use 182,500 daily rollup rows, a 20x row-count reduction.

## Workload

Bearer-authenticated read traffic distributed as 30% cost summary, 30% timeseries, 25% by service, 10% AWS account list, and 5% sync history. Login occurs once during setup and is excluded from measured requests. The supported and failing boundary runs each lasted 15 minutes.

## Acceptance targets

Measured failure rate `<1%`, checks pass rate `>99%`, and every one-minute ALB `TargetResponseTime` datapoint p50 `<30 ms`, p95 `<100 ms`, and p99 `<250 ms`. ALB target response time excludes load-generator-to-ALB Internet transit.

## Capacity results

| Run | Duration | Requests | Requests/s | Failure rate | Checks | Worst p50 | Worst p95 | Worst p99 | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 45 VUs | 15m | 153,992 | 170.90 | 0.0325% | 99.9752% | 15.22 ms | 89.89 ms | 226.96 ms | Pass |
| 50 VUs | 15m | 169,377 | 187.92 | 0.0549% | 99.9588% | 16.54 ms | 127.47 ms | 265.47 ms | Fail |

The documented configuration therefore sustained at least **170.90 requests/second at 45 continuously active VUs**. The first sustained failing level tested was 50 VUs; this establishes a tested boundary, not a claim that 45 VUs equals 45 registered users or that 45 is the absolute maximum.

## Initial smoke and normal-load outcomes

The initial 2-VU smoke run completed 66 measured requests with 0.000% functional failures and 100.000% checks passed. It exposed the pre-rollup cost-query latency bottleneck.

The original ramped normal-load attempt recorded 79.88% failures after the load generator's public IP changed and was therefore invalid for capacity claims. It is retained as failure evidence but excluded from the supported result. A separate stress profile was not run after the fixed-load capacity boundary was established.

## Database optimization evidence

The raw `cost_snapshots` relation occupied 1423 MB; the rollup relation occupied 52 MB. Post-rollup full-year `EXPLAIN (ANALYZE, BUFFERS)` execution times were 63.087 ms for summary, 11.025 ms for timeseries, and 8.155 ms for by-service. All used index-only scans.

## Client-observed endpoint diagnostics

These values include Internet transit from the load-generator location and are retained for diagnosis, not backend acceptance.

| Endpoint | Average | Median | p90 | p95 | Maximum |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cost summary | 140.52 ms | 130.19 ms | 162.82 ms | 195.43 ms | 1631.54 ms |
| Cost timeseries | 208.21 ms | 141.46 ms | 276.01 ms | 373.12 ms | 6610.41 ms |
| Cost by service | 144.52 ms | 131.19 ms | 167.54 ms | 202.12 ms | 1823.98 ms |
| AWS account list | 148.64 ms | 125.90 ms | 165.70 ms | 221.99 ms | 3462.79 ms |
| Sync history | 139.22 ms | 123.70 ms | 152.18 ms | 191.61 ms | 1638.74 ms |

## AWS resource metrics at the supported level

Peak one-minute ECS CPU was 76.21% and ECS memory was 6.93%. Peak RDS CPU was 66.63%, the minimum average freeable memory was 79.84 MiB, and database connections peaked at 10. The ALB recorded 3 load-balancer-generated 5xx responses and 0 target-generated 5xx responses during 153,992 measured requests.

## Observed bottleneck

At 50 VUs, p95 exceeded 100 ms in 5 of 15 one-minute periods and p99 exceeded 250 ms in 1 period. Peak one-minute ECS CPU reached 83.85% and RDS CPU reached 71.19%. Functional reliability still met its target, so server-side tail latency—not widespread request failure—defined the tested capacity boundary.

## Limitations

Synthetic data; one AWS region; one Fargate task; HTTP restricted to one changing public CIDR; one load-generator location; a single-AZ burstable database; 15-minute confirmation windows; no production AWS integrations; and no post-boundary stress run. Results apply only to the documented configuration and workload.

## Exact reproduction

See `../../README.md`. The final confirmation command was:

```bash
CAPACITY_LABEL=post-rollup-soak \
  bash benchmarks/underflow-api/scripts/run-capacity-test.sh 45 15m
```

## Evidence-backed résumé bullet

Built and benchmarked a multi-tenant AWS cost-monitoring API against 3.65M cost records, sustaining 170.90 requests/second with 89.89 ms worst-minute p95 server-side latency under 45 concurrent virtual users.

```latex
\item Built and benchmarked a multi-tenant AWS cost-monitoring API against \textbf{3.65M cost records}, sustaining \textbf{170.90 requests/second} with \textbf{89.89 ms worst-minute p95 server-side latency} under \textbf{45 concurrent virtual users}.
```
