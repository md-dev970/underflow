# Underflow authenticated API benchmark

This benchmark measures the real bearer-authenticated, PostgreSQL-backed cost-reporting paths against a deterministic synthetic dataset. It deliberately excludes login latency from the measured metric while retaining bearer authentication—and therefore the database-backed user lookup—on every measured request.

No result in this directory should be treated as measured evidence until all commands complete and a timestamped result directory contains the required JSON files. A failed k6 threshold is evidence and must be preserved as-is.

## Safety boundary

The only authorized Terraform root is `infra/terraform/envs/api-benchmark`. It has local, isolated state and does not reference production state or modules. Every named resource begins with `underflow-api-bench-<id>` and AWS provider default tags apply:

- `project = underflow`
- `environment = api-benchmark`
- `purpose = disposable-load-test`
- `managed = terraform`

Never run these commands from `infra/terraform/envs/production`. Never use production data or real AWS account integrations. The benchmark creates one VPC, two public subnets, an internet gateway and route table, three narrowly scoped security groups, ECR, one ECS cluster/service/task definition, one ALB/listener/target group, one log group, one non-public single-AZ RDS instance, IAM execution/runtime roles, and one zero-recovery Secrets Manager secret. It creates no NAT gateway, private subnet, DNS, certificate, HTTPS listener, SES, Lambda, EventBridge, worker, autoscaling, Stripe, S3, or CloudFront resource.

## Prerequisites and run identity

Commands below assume Bash plus AWS CLI v2, Docker with BuildKit, Terraform, jq, Python 3, and a native k6 installation available in the same shell that runs the benchmark. Docker is used to build the API image, but not to run k6. Keep shell history disabled while handling the generated benchmark password.

```bash
export REPO_ROOT="$(git rev-parse --show-toplevel)"
export TF_ROOT="$REPO_ROOT/infra/terraform/envs/api-benchmark"
export GIT_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD)"
export SHORT_SHA="$(printf '%s' "$GIT_SHA" | cut -c1-8)"
export BENCHMARK_ID="$SHORT_SHA"
export AWS_REGION="us-east-1"
export LOAD_TEST_IP="$(curl --fail --silent https://checkip.amazonaws.com | tr -d '\r\n')"
export LOAD_TEST_CIDR="$LOAD_TEST_IP/32" # public /32 of this host, where native k6 runs
export RUN_DATE="$(date -u +%F)"
export RESULTS_DIR="$REPO_ROOT/benchmarks/underflow-api/results/${RUN_DATE}-${SHORT_SHA}"
mkdir -p "$RESULTS_DIR"
command -v k6 >/dev/null
k6 version
```

Record the clean baseline before editing or deployment:

```bash
git -C "$REPO_ROOT" status --short
git -C "$REPO_ROOT" rev-parse HEAD
cd "$REPO_ROOT/apps/api"
npm ci
npm run build
npm test
# Only when a disposable PostgreSQL DATABASE_URL is configured:
npm run test:db
```

## Configure and validate isolated Terraform

Create the ignored `terraform.tfvars`; do not commit it:

```bash
cat > "$TF_ROOT/terraform.tfvars" <<EOF
aws_region     = "$AWS_REGION"
benchmark_id   = "$BENCHMARK_ID"
load_test_cidr = "$LOAD_TEST_CIDR"
image_tag      = "$GIT_SHA"
performance_insights_enabled = false
EOF

terraform -chdir="$TF_ROOT" fmt -check -recursive
terraform -chdir="$TF_ROOT" init
terraform -chdir="$TF_ROOT" validate

# Run if already installed; do not suppress findings.
command -v tfsec >/dev/null && tfsec "$TF_ROOT"

terraform -chdir="$TF_ROOT" plan -out=tfplan
terraform -chdir="$TF_ROOT" show -no-color tfplan > "$RESULTS_DIR/terraform-plan.txt.raw"
"$REPO_ROOT/benchmarks/underflow-api/scripts/sanitize-results.sh" \
  "$RESULTS_DIR/terraform-plan.txt.raw" "$RESULTS_DIR/terraform-plan.txt"
rm "$RESULTS_DIR/terraform-plan.txt.raw"
```

Before applying, read the plan and confirm:

```bash
export PREFIX="underflow-api-bench-$BENCHMARK_ID"
terraform -chdir="$TF_ROOT" show -no-color tfplan | less
terraform -chdir="$TF_ROOT" show -json tfplan | jq -r \
  '.resource_changes[] | select(.mode == "managed") | [.type, .name, (.change.actions | join(","))] | @tsv'
```

The review must show only this root's benchmark resources, the benchmark prefix on every name-capable AWS resource, the four tags on every tag-capable resource, non-public RDS, ECS port 3080 ingress only from the ALB security group, ALB port 80 ingress only from `load_test_cidr`, and none of the excluded service types. Terraform state must be local to this root.

If the native load generator's public IP changes after deployment, update only the ALB ingress rule and verify health with the guarded helper. It refuses to apply a plan that changes any managed resource other than `aws_security_group.alb`:

```bash
bash "$REPO_ROOT/benchmarks/underflow-api/scripts/update-load-test-ip.sh"
```

## Bootstrap ECR, build, and deploy

The reviewed configuration is applied first to only its disposable ECR resource so the immutable image exists before ECS starts. This target is in the isolated benchmark root; it does not address any existing Underflow resource.

```bash
terraform -chdir="$TF_ROOT" apply -target=aws_ecr_repository.api
export ECR_REPOSITORY="$(terraform -chdir="$TF_ROOT" output -raw ecr_repository_url)"
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "${ECR_REPOSITORY%%/*}"
docker buildx build --platform linux/amd64 \
  --tag "$ECR_REPOSITORY:$GIT_SHA" --push "$REPO_ROOT/apps/api"
export IMAGE_DIGEST="$(aws ecr describe-images --region "$AWS_REGION" \
  --repository-name "${ECR_REPOSITORY##*/}" --image-ids imageTag="$GIT_SHA" \
  --query 'imageDetails[0].imageDigest' --output text)"
test -n "$IMAGE_DIGEST" && test "$IMAGE_DIGEST" != "None"

# Refresh and review the complete plan after the immutable image exists.
terraform -chdir="$TF_ROOT" plan -out=tfplan
terraform -chdir="$TF_ROOT" show -no-color tfplan | less
terraform -chdir="$TF_ROOT" apply tfplan
aws ecs wait services-stable --region "$AWS_REGION" \
  --cluster "$(terraform -chdir="$TF_ROOT" output -raw ecs_cluster_name)" \
  --services "$(terraform -chdir="$TF_ROOT" output -raw ecs_service_name)"
export BASE_URL="$(terraform -chdir="$TF_ROOT" output -raw api_base_url)"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "$BASE_URL/api/v1/health")" = "200"
```

Record only sanitized, non-secret environment metadata. Do not save the full `terraform output -json`, because it includes a sensitive secret ARN. The helper script creates and validates the metadata file:

```bash
"$REPO_ROOT/benchmarks/underflow-api/scripts/collect-environment.sh"
jq . "$RESULTS_DIR/environment.json"
```

## Migrate and seed

Both commands launch one-off Fargate tasks from the deployed API task definition with identical subnets, security group, image, environment, and Secrets Manager injection. The runner waits for task completion and requires container exit code zero.

```bash
export BENCHMARK_RESULTS_DIR="$RESULTS_DIR"
"$REPO_ROOT/benchmarks/underflow-api/scripts/run-one-off-task.sh" migrate
"$REPO_ROOT/benchmarks/underflow-api/scripts/run-one-off-task.sh" seed
jq -e '.users == 10 and .workspaces == 10 and .awsAccounts == 200 and .costSnapshots == 3650000 and .costRollups == 182500' \
  "$RESULTS_DIR/dataset.json"
```

The seeder requires `ALLOW_BENCHMARK_SEED=true`, uses only reserved UUIDs and `example.invalid` identities, bulk-loads with PostgreSQL set operations, replaces only its fixed dataset, verifies exact counts, builds 182,500 workspace/date/service rollups from the 3,650,000 raw snapshots, and runs `ANALYZE`. The generated password is never logged. The first identity is `benchmark+01@example.invalid`, and its workspace is `20000000-0000-4000-8000-000000000001`.

After deploying the rollup migration over an already-seeded benchmark database, backfill without reseeding the raw dataset:

```bash
export BENCHMARK_RESULTS_DIR="$RESULTS_DIR"
"$REPO_ROOT/benchmarks/underflow-api/scripts/run-one-off-task.sh" rollup
```

The guarded backfill rebuilds all rollups transactionally and records its sanitized output in `rollup-task.log`. Normal synchronization refreshes only the affected workspace/date range under a workspace-scoped transaction lock. Workspace-wide summary, timeseries, and by-service reads use rollups; account-filtered reads continue to use raw snapshots.

To capture a baseline PostgreSQL execution plan for the full-year cost-summary query without exposing RDS publicly, run the diagnostic one-off task and preserve its sanitized output:

```bash
export BENCHMARK_RESULTS_DIR="$RESULTS_DIR"
"$REPO_ROOT/benchmarks/underflow-api/scripts/run-one-off-task.sh" explain
```

The resulting `explain-task.log` contains `EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON)` for summary, timeseries, and by-service queries, plus sanitized `cost_snapshots` table/index size and scan counters. Capture this baseline before adding an index or changing a query.

## Preflight and k6 execution

Run native k6 from this host, outside ECS and outside Docker. The ALB permits only `load_test_cidr`, so it must be this host's current public `/32`; if the address changes, update `terraform.tfvars`, review a new plan, and apply it before continuing. Fetch the generated synthetic password into an environment variable without echoing it, then disable shell history and verify one healthy task, the seed counts, and health before testing.

```bash
set +o history
export TEST_EMAIL="benchmark+01@example.invalid"
export WORKSPACE_ID="20000000-0000-4000-8000-000000000001"
export TEST_PASSWORD="$(aws secretsmanager get-secret-value --region "$AWS_REGION" \
  --secret-id "$PREFIX-runtime" --query SecretString --output text | jq -r '.BENCHMARK_PASSWORD')"
test -n "$TEST_PASSWORD"

aws ecs describe-services --region "$AWS_REGION" \
  --cluster "$(terraform -chdir="$TF_ROOT" output -raw ecs_cluster_name)" \
  --services "$(terraform -chdir="$TF_ROOT" output -raw ecs_service_name)" \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}'
curl --fail --silent "$BASE_URL/api/v1/health"

export RESULTS_DIR
k6 run "$REPO_ROOT/benchmarks/underflow-api/k6/smoke.js"

# Unmeasured 60-second warm-up; preserve separately from smoke and normal load.
SMOKE_DURATION=60s SUMMARY_NAME=warmup-summary.json \
  k6 run "$REPO_ROOT/benchmarks/underflow-api/k6/smoke.js"
sleep 30

export LOAD_START="$(date -u +%FT%TZ)"
k6 run "$REPO_ROOT/benchmarks/underflow-api/k6/load.js"
export LOAD_END="$(date -u +%FT%TZ)"
```

The scripts use deterministic iteration buckets for the 30/30/25/10/5 distribution, validate status, JSON, response shape, and authorization/server errors, and save compact summaries through `handleSummary`. k6 retains the client-observed failure rate `<1%`, p95 `<200 ms`, p99 `<500 ms`, and checks `>99%` thresholds; per-endpoint values are retained. Because a developer-machine run includes location-dependent Internet transit, the primary backend latency reported by this benchmark is the ALB `TargetResponseTime` p50/p90/p95/p99 collected from CloudWatch. Client-observed k6 latency remains evidence and must be labeled with the load-generator location rather than relabeled or discarded. Login is tagged as setup and excluded from `measured_*` metrics.

### Capacity discovery on the baseline database class

When the normal profile saturates the documented `db.t4g.micro`, preserve that failed run and determine the configuration's actual capacity with independent constant-load levels. Test 2, 3, 4, and 5 VUs, stopping once a level fails or once the first failing level above the highest passing level is established. A passing level has no functional failures and every one-minute ALB `TargetResponseTime` p95 below 200 ms and p99 below 500 ms. Refresh the ALB ingress CIDR before each level; never update it during a measured interval.

For each level, run the following block after setting `CAPACITY_VUS` to 2, 3, 4, or 5:

```bash
bash "$REPO_ROOT/benchmarks/underflow-api/scripts/update-load-test-ip.sh"
export CAPACITY_VUS=5
export CAPACITY_START="$(date -u +%FT%TZ)"
CAPACITY_VUS="$CAPACITY_VUS" CAPACITY_DURATION=3m \
  k6 run "$REPO_ROOT/benchmarks/underflow-api/k6/capacity.js"
export CAPACITY_END="$(date -u +%FT%TZ)"

# Allow one-minute CloudWatch statistics to become available.
sleep 120

AWS_REGION="$AWS_REGION" \
ECS_CLUSTER="$(terraform -chdir="$TF_ROOT" output -raw ecs_cluster_name | tr -d '\r')" \
ECS_SERVICE="$(terraform -chdir="$TF_ROOT" output -raw ecs_service_name | tr -d '\r')" \
RDS_IDENTIFIER="$(terraform -chdir="$TF_ROOT" output -raw rds_identifier | tr -d '\r')" \
ALB_ARN_SUFFIX="$(terraform -chdir="$TF_ROOT" output -raw load_balancer_arn_suffix | tr -d '\r')" \
TARGET_GROUP_ARN_SUFFIX="$(terraform -chdir="$TF_ROOT" output -raw target_group_arn_suffix | tr -d '\r')" \
START_TIME="$CAPACITY_START" END_TIME="$CAPACITY_END" \
OUTPUT_FILE="$RESULTS_DIR/capacity-${CAPACITY_VUS}vus-cloudwatch.json" \
  "$REPO_ROOT/benchmarks/underflow-api/scripts/collect-aws-metadata.sh"
```

The k6 summary is saved as `capacity-<N>vus-summary.json`. A run aborted for network failures is invalid, must be preserved as such, and cannot establish capacity. The supported level is the highest fully valid level whose server-side threshold passes; do not interpolate or claim the next failing level.

Run stress only when the normal profile completes, thresholds are reviewed, the service remains healthy, and the load generator is not saturated:

```bash
export STRESS_START="$(date -u +%FT%TZ)"
k6 run "$REPO_ROOT/benchmarks/underflow-api/k6/stress.js"
export STRESS_END="$(date -u +%FT%TZ)"
```

Stress aborts after a sustained measured failure rate above 5%. Treat its breaking point as configuration-specific, never as a fabricated supported-user claim. Record load-generator CPU/network separately if it approaches saturation.

## Collect CloudWatch evidence and generate results

Collect metrics immediately after each measured interval (use distinct output names if collecting smoke and stress separately). The required final `cloudwatch-summary.json` should cover normal load. ALB target-response datapoints contain server-side p50, p90, p95, and p99 extended statistics for each 60-second period; do not describe these as end-to-end client latency.

```bash
AWS_REGION="$AWS_REGION" \
ECS_CLUSTER="$(terraform -chdir="$TF_ROOT" output -raw ecs_cluster_name)" \
ECS_SERVICE="$(terraform -chdir="$TF_ROOT" output -raw ecs_service_name)" \
RDS_IDENTIFIER="$(terraform -chdir="$TF_ROOT" output -raw rds_identifier)" \
ALB_ARN_SUFFIX="$(terraform -chdir="$TF_ROOT" output -raw load_balancer_arn_suffix)" \
TARGET_GROUP_ARN_SUFFIX="$(terraform -chdir="$TF_ROOT" output -raw target_group_arn_suffix)" \
START_TIME="$LOAD_START" END_TIME="$LOAD_END" \
OUTPUT_FILE="$RESULTS_DIR/cloudwatch-summary.json" \
  "$REPO_ROOT/benchmarks/underflow-api/scripts/collect-aws-metadata.sh"

"$REPO_ROOT/benchmarks/underflow-api/scripts/generate-results.sh" \
  "$RESULTS_DIR" "$RESULTS_DIR/RESULTS.md"
```

The generator refuses missing evidence and mechanically derives requests/second, p95, concurrency, dataset size, and the résumé bullet from preserved JSON. Review `RESULTS.md` for supported bottleneck observations; do not replace failed thresholds or missing stress evidence with estimates.

Required timestamped evidence is:

```text
environment.json
dataset.json
smoke-summary.json
load-summary.json
stress-summary.json        # only if safely performed
cloudwatch-summary.json
RESULTS.md
```

## Repository validation and secret scan

Before teardown, verify the repository and evidence while the environment is still available for diagnosis:

```bash
cd "$REPO_ROOT/apps/api"
npm run build
npm test
terraform -chdir="$TF_ROOT" fmt -check -recursive
terraform -chdir="$TF_ROOT" validate

node --check "$REPO_ROOT/benchmarks/underflow-api/k6/common.js"
node --check "$REPO_ROOT/benchmarks/underflow-api/k6/smoke.js"
node --check "$REPO_ROOT/benchmarks/underflow-api/k6/load.js"
node --check "$REPO_ROOT/benchmarks/underflow-api/k6/stress.js"
bash -n "$REPO_ROOT/benchmarks/underflow-api/scripts/"*.sh

git -C "$REPO_ROOT" diff --check
git -C "$REPO_ROOT" status --short
git -C "$REPO_ROOT" diff --stat
git -C "$REPO_ROOT" diff -- . ':!infra/terraform/envs/production'

# These scans must print nothing. Review any match before proceeding.
git -C "$REPO_ROOT" ls-files --others --exclude-standard --cached | \
  grep -E '(\.tfstate|\.tfvars$|\.tfplan$)' || true
rg -n --hidden --glob '!**/.terraform/**' --glob '!**/node_modules/**' \
  '(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|[0-9]{12}\.dkr\.ecr\.|\.rds\.amazonaws\.com)' \
  "$REPO_ROOT/infra/terraform/envs/api-benchmark" "$REPO_ROOT/benchmarks/underflow-api" || true
```

The synthetic 12-digit account-number generator in the seeder is expected source code; no real account number may appear in code or evidence.

## Mandatory Terraform-only destruction

Do not begin until the timestamped evidence exists outside `.terraform`, is sanitized, and `RESULTS.md` has been generated. Destroy only from the exact isolated root.

```bash
test "$(cd "$TF_ROOT" && pwd)" = "$TF_ROOT"
for file in environment.json dataset.json smoke-summary.json load-summary.json cloudwatch-summary.json RESULTS.md; do
  test -s "$RESULTS_DIR/$file"
done

terraform -chdir="$TF_ROOT" output -json | \
  jq '{aws_region,resource_prefix,ecs_cluster_name,ecs_service_name,rds_identifier,availability_zones}' \
  > "$RESULTS_DIR/final-terraform-outputs.json"
terraform -chdir="$TF_ROOT" state list | tee "$RESULTS_DIR/terraform-state-list.txt"
terraform -chdir="$TF_ROOT" state list | grep -E 'envs.production|platform_stack' && exit 1 || true

# Stop only active one-off tasks in this isolated benchmark cluster. Service
# tasks have a `service:` group and are left for Terraform to remove.
export CLUSTER="$(terraform -chdir="$TF_ROOT" output -raw ecs_cluster_name)"
export TASK_ARNS="$(aws ecs list-tasks --region "$AWS_REGION" --cluster "$CLUSTER" \
  --desired-status RUNNING --family "$PREFIX-api" --query 'taskArns[]' --output text)"
if [[ -n "$TASK_ARNS" && "$TASK_ARNS" != "None" ]]; then
  for task in $(aws ecs describe-tasks --region "$AWS_REGION" --cluster "$CLUSTER" \
    --tasks $TASK_ARNS --output json | \
    jq -r '.tasks[] | select(.group | startswith("family:")) | .taskArn'); do
    aws ecs stop-task --region "$AWS_REGION" --cluster "$CLUSTER" --task "$task" \
      --reason 'benchmark teardown' >/dev/null
  done
fi

terraform -chdir="$TF_ROOT" plan -destroy -out=destroy.tfplan
terraform -chdir="$TF_ROOT" show -no-color destroy.tfplan | less
terraform -chdir="$TF_ROOT" apply destroy.tfplan
test -z "$(terraform -chdir="$TF_ROOT" state list)"
```

Finally verify by benchmark prefix that ECS, ELBv2, RDS, ECR, Secrets Manager, CloudWatch Logs, and EC2/VPC resources are absent. Queries must use `$PREFIX`; never delete unrelated matches manually.

```bash
aws ecs list-clusters --region "$AWS_REGION" --query "clusterArns[?contains(@, '$PREFIX')]"
aws elbv2 describe-load-balancers --region "$AWS_REGION" --query "LoadBalancers[?contains(LoadBalancerName, '$PREFIX')]"
aws rds describe-db-instances --region "$AWS_REGION" --query "DBInstances[?contains(DBInstanceIdentifier, '$PREFIX')]"
aws ecr describe-repositories --region "$AWS_REGION" --query "repositories[?contains(repositoryName, '$PREFIX')]"
aws secretsmanager list-secrets --region "$AWS_REGION" --include-planned-deletion \
  --query "SecretList[?contains(Name, '$PREFIX')]"
aws logs describe-log-groups --region "$AWS_REGION" --log-group-name-prefix "/ecs/$PREFIX"
aws ec2 describe-vpcs --region "$AWS_REGION" \
  --filters "Name=tag:Name,Values=$PREFIX*" --query 'Vpcs[].VpcId'
aws ecs list-tasks --region "$AWS_REGION" --cluster "$PREFIX-cluster" --desired-status RUNNING 2>/dev/null || true
```

All result arrays must be empty. Remove ignored `terraform.tfvars`, plan files, local state, and any temporary raw logs only after successful destruction; retain sanitized timestamped results and repository changes. Do not commit or push without explicit authorization.
