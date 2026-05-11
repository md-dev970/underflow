# Production Deployment

This document is the first-deployment guide for running Underflow on AWS with:

- `https://underflow.[yourdomain].com` for the web app
- `https://api.underflow.[yourdomain].com/api/*` for the API
- ECS Fargate for the API and worker
- RDS PostgreSQL
- S3 + CloudFront for the frontend
- GitHub Actions for CI/CD

## Topology

- CloudFront
  - serves the Vite build from S3 for `underflow.[yourdomain].com`
- ECS Fargate
  - one API service
  - one worker service
  - one migration task definition used during deploy
- EventBridge + Lambda
  - one scheduled cost sync Lambda triggered every 6 hours
- Application Load Balancer
  - terminates TLS for `api.underflow.[yourdomain].com`
  - forwards `/api/v1/*` traffic to the API ECS service
- RDS PostgreSQL
  - private subnets only
- Route 53 + ACM
  - CloudFront certificate in `us-east-1`
  - API ALB certificate in the primary region
  - alias record for `underflow.[yourdomain].com`
  - alias record for `api.underflow.[yourdomain].com`

## One-Time Bootstrap Order

### 1. Apply the bootstrap Terraform environment locally

Use [`infra/terraform/envs/bootstrap-cicd`](../infra/terraform/envs/bootstrap-cicd) first. That creates:

- the Terraform remote-state bucket
- the DynamoDB lock table
- the GitHub OIDC deploy role

Suggested flow:

```powershell
cd infra\terraform\envs\bootstrap-cicd
Copy-Item terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

### 2. Configure GitHub Actions access

Create a GitHub `production` environment and add the variables and secrets listed below.

Recommended branch controls:

- protect `main`
- require CI to pass before merge
- restrict production deploy workflow usage to trusted maintainers

### 3. Initialize the production Terraform backend

Use [`infra/terraform/envs/production/backend.hcl.example`](../infra/terraform/envs/production/backend.hcl.example) as the template for the remote state backend.

```powershell
cd infra\terraform\envs\production
terraform init -backend-config=backend.hcl
```

Before running `terraform plan` or `terraform apply` locally, build the scheduled sync Lambda artifact:

```powershell
cd apps\api
npm install
npm run build:lambda
```

The Lambda artifact is built from the API codebase and must exist before Terraform can package it locally.

### 4. Run the first production apply

The deploy workflow is designed to own the ongoing rollout, but it is still useful to understand the shape:

1. build the scheduled sync Lambda artifact
2. bootstrap the ECR repository
3. build and push the API image
4. run full Terraform apply with the image URI and Lambda artifact
5. run the migration task
6. wait for ECS services to stabilize
7. sync the frontend build to S3
8. invalidate CloudFront

## GitHub Environment Variables

Add these as `production` environment variables in GitHub:

- `AWS_REGION`
- `APP_DOMAIN_NAME`
- `ROUTE53_ZONE_ID`
- `WEB_BUCKET_NAME`
- `TF_STATE_BUCKET`
- `TF_STATE_LOCK_TABLE`
- `ECR_REPOSITORY_NAME`
- `DB_NAME`
- `DB_USERNAME`
- `ALERT_EMAIL_FROM`
- `AUTH_EMAIL_FROM`
- `AUTH_COOKIE_DOMAIN`
- `AUTH_COOKIE_SAME_SITE`
- `COST_SYNC_LOOKBACK_DAYS`
- `SCHEDULED_SYNC_INTERVAL_HOURS`
- `AWS_SES_REGION`
- `EMAIL_PROVIDER`
- `BILLING_ENABLED`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `LOG_LEVEL`
- `RATE_LIMIT_AUTH_WINDOW_MS`
- `RATE_LIMIT_AUTH_MAX_REQUESTS`
- `RATE_LIMIT_MUTATION_WINDOW_MS`
- `RATE_LIMIT_MUTATION_MAX_REQUESTS`

## GitHub Environment Secrets

Add these as `production` environment secrets in GitHub:

- `AWS_GITHUB_ACTIONS_ROLE_ARN`
- `DB_PASSWORD`
- `CSRF_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Workflow Responsibilities

### `ci.yml`

- API build + tests
- web build + tests
- Docker build check for the API image
- Terraform `fmt` + `validate`

### `build-api-image.yml`

- builds the hardened API image
- pushes `${GITHUB_SHA}` and `latest` tags to ECR

### `deploy-production.yml`

- builds the scheduled sync Lambda artifact from the API codebase
- initializes production Terraform
- ensures the ECR repo exists
- builds and pushes the current API image
- applies Terraform with the image URI
- runs migrations through ECS
- waits for API and worker services to stabilize
- updates the scheduled sync Lambda code package and handler configuration when Lambda-related changes are present

### `deploy-web.yml`

- reads `api_url` from Terraform output
- builds the frontend with `VITE_API_URL=https://api.underflow.[yourdomain].com/api/v1`
- uploads static assets to S3
- invalidates CloudFront

## Runtime Contract

### API and worker

The production runtime uses the same compiled image, with different commands:

- API: `node dist/server.js`
- worker: `node dist/jobs/worker.js`
- migrate: `node dist/db/migrate.js`

The ECS task runtime role is responsible for:

- `sts:AssumeRole` into customer `UnderflowCostExplorerRead` roles
- SES send permissions

For the split-domain setup, prefer leaving `AUTH_COOKIE_DOMAIN` empty so auth cookies remain host-only on `api.underflow.[yourdomain].com`.

### Scheduled cost sync Lambda

- runs every 6 hours through EventBridge
- uses the same sync service path as manual account syncs
- writes visible execution history through existing `cost_sync_runs` rows
- emits invocation-level logs to CloudWatch
- syncs all verified AWS accounts while relying on advisory locks to avoid duplicate per-account work
- validates only the shared runtime env needed for DB/AWS/logging rather than API-only auth/cookie config

### Web

Production web builds should use:

```text
VITE_API_URL=https://api.underflow.[yourdomain].com/api/v1
```

## First-Deploy Smoke Tests

Run these checks immediately after the first deployment:

1. `https://underflow.[yourdomain].com` loads successfully.
2. `https://api.underflow.[yourdomain].com/api/v1/health` returns `200`.
3. Signup works.
4. Login works.
5. Forgot-password email is delivered.
6. Workspace creation works.
7. AWS account connect + verify works.
8. Sync runs and cost data appears.
9. Alert evaluation runs and alert email delivery works.

## Rollback Guidance

- roll back API/worker by redeploying the previous image tag
- roll back the scheduled sync Lambda by applying the previous Terraform/code revision if the issue is limited to recurring sync
- redeploy the previous web build if the issue is frontend-only
- if a migration introduced the problem, stop and restore from backup rather than improvising production SQL

## Lambda Troubleshooting

If the scheduled sync Lambda fails in production:

1. Inspect the Lambda invocation response with tail logs:

```bash
aws lambda invoke \
  --region us-west-2 \
  --function-name underflow-prod-scheduled-cost-sync \
  --log-type Tail \
  response.json \
  --query 'LogResult' \
  --output text | base64 --decode

cat response.json
```

2. Check the configured handler:

```bash
aws lambda get-function-configuration \
  --region us-west-2 \
  --function-name underflow-prod-scheduled-cost-sync \
  --query 'Handler' \
  --output text
```

Expected handler:

```text
dist/jobs/scheduled-cost-sync-handler.handler
```

3. If local `terraform apply` is being used, rebuild the Lambda artifact first:

```powershell
cd apps\api
npm run build:lambda
```

4. If the Lambda still fails before structured app logs appear, look for bootstrap errors such as:

- `Runtime.HandlerNotFound`
- missing module/package errors
- missing required runtime environment variables
