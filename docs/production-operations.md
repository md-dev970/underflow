# Production Operations

This document is the minimum viable runbook for operating Underflow with a first cohort of real users.

## Runtime Shape

- `apps/api`
  - stateless HTTP API
  - should run with a runtime execution role, not long-lived production access keys
- `apps/api` worker process
  - runs scheduled sync and alert evaluation jobs
  - should use the same AWS/runtime identity and database as the API
- `apps/web`
  - static frontend served separately from the API
- PostgreSQL
  - primary system of record for users, workspaces, AWS accounts, cost data, alerts, and notifications

## Required Environment Contracts

### API / worker

- `DATABASE_URL`
- `CLIENT_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CSRF_SECRET`
- `AWS_REGION`
- `AWS_SES_REGION`
- `AUTH_EMAIL_FROM`
- `ALERT_EMAIL_FROM`

Production defaults and expectations:

- prefer runtime role credentials over `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- cookies are marked `secure` automatically in production mode
- set cookie same-site and client origin values explicitly per environment
- keep billing disabled unless intentionally turned on for a later rollout

### Web

- `VITE_API_URL`

## Deploy And Roll Back

### Deploy

1. Build the API and web artifacts.
2. Deploy the API.
3. Run API migrations once against the target database.
4. Deploy or restart the worker process.
5. Deploy the frontend.
6. Verify health and a basic authenticated page load.

### Roll back

1. Roll back the API and worker to the last known good image/build.
2. Roll back the frontend if the issue is client-visible.
3. If a migration caused the issue, stop and restore from backup rather than improvising destructive SQL.

## Health And Readiness

- use `GET /api/v1/health` as the basic liveness check
- treat API readiness as:
  - database reachable
  - migrations already applied
  - worker running separately for scheduled sync and alert evaluation

## Observability Baseline

Underflow already emits structured JSON logs to stdout/stderr. In production:

- aggregate API and worker logs centrally
- build dashboards/alerts around:
  - AWS verification failures
  - AWS sync failures
  - alert evaluation failures
  - password reset email delivery failures
  - failed notification deliveries

Recommended counters to track from logs:

- successful sync count
- failed sync count
- successful alert delivery count
- failed alert delivery count
- failed auth email delivery count

## Troubleshooting

### AWS verification fails

Check:

- customer account ID matches the one entered in Underflow
- customer role name/path matches the expected role ARN
- trust policy includes the Underflow AWS account ID
- external ID matches exactly
- the Underflow backend runtime identity can call `sts:AssumeRole`

### Sync succeeds but no cost data appears

Check:

- Cost Explorer is enabled in the customer AWS account
- billing data is actually available for the requested time range
- the selected account/date filters in the UI are correct
- sync history does not show Cost Explorer permission or data-availability errors

### SES / email failures

Check:

- sender identity is verified in the correct region
- recipient is verified if still in SES sandbox
- the runtime identity can send through SES
- the region in env matches the SES identity region

## Backup And Restore Expectations

- database backups must exist before production rollout
- test restore procedures before inviting real users
- prefer restoring from backup over ad hoc manual cleanup for production incidents
