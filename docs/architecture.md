# Architecture Overview

Underflow is split into three main areas: an API, a frontend application, and infrastructure code that supports AWS integrations, email delivery, and production deployment.

## System Shape

### `apps/api`

The API is responsible for:

- authentication and session handling for browser and mobile-style clients
- CSRF protection for browser flows
- user profile, preferences, and session management
- workspace management
- AWS account onboarding via AssumeRole metadata
- cost reporting endpoints
- alert creation and alert evaluation primitives
- notifications, billing, and supporting integrations
- background execution entrypoints and DB-backed job safety

The backend includes:

- structured logging
- rate limiting
- standardized error envelopes
- JWT/session-version validation
- DB-backed advisory locking for recurring sync and alert work

### `apps/web`

The frontend is a React application responsible for:

- auth pages and session-aware routing
- workspace onboarding
- AWS account connection flows
- cost dashboards and reporting screens
- alerts, notifications, and settings pages
- responsive authenticated app shell

It also includes route-based code splitting, route-level loading and retryable error handling, and frontend test coverage for the major authenticated flows.

### `infra/terraform`

Infrastructure code provisions the production AWS footprint and supporting integrations:

- Route 53 hosted zones and DNS records
- SES identities and mail records
- ECS services for API and worker runtimes
- Lambda for scheduled cost sync
- RDS PostgreSQL
- S3, CloudFront, and ALB resources
- CI/CD bootstrap resources such as Terraform state and GitHub OIDC

## Main Runtime Flows

### Authentication

- Browser clients use cookie-based auth and CSRF protection
- Mobile-style clients use bearer-style token flows
- Session versioning invalidates old access when passwords change or sessions are revoked

### Workspace and AWS onboarding

- Users create a workspace
- AWS accounts are connected by storing AssumeRole metadata
- Verification and later sync/reporting flows use that stored metadata as the integration boundary

### Cost monitoring

- Cost data is synced through the backend using assumed AWS credentials
- A scheduled Lambda can run cost sync across all verified AWS accounts on a fixed interval
- Reporting endpoints expose summary, by-service, timeseries, and sync history views
- The frontend presents this through workspace-scoped dashboards and detail pages
- Manual syncs and scheduled syncs share the same persistence path and use advisory locks to avoid duplicate per-account work

### Alerts and notifications

- Alert rules are attached to a workspace, optionally scoped to a specific AWS account
- The ECS worker evaluates active alerts on a schedule
- Notification delivery and status are persisted and surfaced in the frontend feed

## Runtime Ownership

- ECS API
  - handles browser/app HTTP traffic
  - owns auth, workspace management, AWS account onboarding, reporting APIs, and manual sync triggers
- ECS worker
  - handles scheduled alert evaluation and related background work
- Lambda + EventBridge
  - handles recurring verified-account cost sync every 6 hours
  - writes CloudWatch invocation logs and DB-backed sync history through existing `cost_sync_runs`

## Email / SES Integration Boundary

Email is treated as a real integration boundary rather than a mocked afterthought.

- Terraform provisions SES identity-related DNS
- Route 53 hosts the delegated project subdomain
- The parent domain can remain at its existing registrar or DNS provider
- SES still requires normal production-access and domain-verification steps in AWS

## Current Architectural Tradeoffs

- The repository is intentionally broad and demonstrates system thinking over minimalism
- Background processing is intentionally split by responsibility:
  - Lambda handles scheduled cost sync
  - ECS worker handles alert evaluation
- Runtime configuration is intentionally split as well:
  - shared DB/AWS/logging config is used by API, worker, and Lambda
  - auth/cookie-specific config is validated only in the API runtime
- Some cloud integrations are fully wired but still benefit from live-account validation before they should be considered fully hardened
