# Architecture Overview

Underflow is split into three main areas: an API, a frontend application, and infrastructure code that supports external integrations such as SES and Route 53.

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
- background worker entrypoints and DB-backed job safety

The backend has evolved from raw schema bootstrapping to a migration-based setup and now includes:

- structured logging
- rate limiting
- standardized error envelopes
- JWT/session-version validation
- DB-backed job locking for recurring sync/alert work

### `apps/web`

The frontend is a React application responsible for:

- auth pages and session-aware routing
- workspace onboarding
- AWS account connection flows
- cost dashboards and reporting screens
- alerts, notifications, and settings pages
- responsive authenticated app shell

It now includes:

- route-based code splitting
- route-level loading and retryable error handling
- frontend tests for major authenticated flows

### `infra/terraform`

Infrastructure code currently focuses on shared AWS resources, especially the email/domain setup:

- Route 53 hosted zones
- SES identities
- DKIM records
- custom `MAIL FROM`
- DMARC support

The current pattern is designed around a delegated subdomain such as `underflow.example.com`, keeping the project isolated from the rest of a parent domain.

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

- Cost data is synced through API/worker logic
- Reporting endpoints expose summary, by-service, timeseries, and sync history views
- The frontend presents this through workspace-scoped dashboards and detail pages

### Alerts and notifications

- Alert rules are attached to a workspace, optionally scoped to a specific AWS account
- Background alert evaluation logic creates events and notification deliveries
- Notifications are surfaced in the frontend feed

## Email / SES Integration Boundary

Email is intentionally treated as a real-integration boundary rather than purely mocked infrastructure.

- Terraform provisions SES identity-related DNS
- Route 53 hosts the delegated project subdomain
- The parent domain remains at its existing registrar/DNS provider unless you choose otherwise
- Manual steps still exist for:
  - subdomain delegation in the parent DNS zone
  - SES production-access approval

## Current Architectural Tradeoffs

- The repository is intentionally optimized for learning and demonstration breadth, not minimalism
- Infrastructure is split between app-local starter assets and new root-level shared Terraform
- Some providers are fully integrated in local/test mode but still require real-account validation before they can be called “finished”

## What A Reviewer Should Notice

- The project goes beyond UI work and touches auth, DB migrations, cloud integrations, background jobs, testing, and infrastructure
- Production-style concerns are visible even where the repository is still under active development
- The implementation is broad enough to demonstrate system thinking, not just isolated feature work
