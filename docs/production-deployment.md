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

### 4. Run the first production apply

The deploy workflow is designed to own the ongoing rollout, but it is still useful to understand the shape:

1. bootstrap the ECR repository
2. build and push the API image
3. run full Terraform apply with the image URI
4. run the migration task
5. wait for ECS services to stabilize
6. sync the frontend build to S3
7. invalidate CloudFront

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

- initializes production Terraform
- ensures the ECR repo exists
- builds and pushes the current API image
- applies Terraform with the image URI
- runs migrations through ECS
- waits for API and worker services to stabilize

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
- redeploy the previous web build if the issue is frontend-only
- if a migration introduced the problem, stop and restore from backup rather than improvising production SQL
