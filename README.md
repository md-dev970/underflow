# Underflow

Underflow is a full-stack AWS cost monitoring project built to explore production-style SaaS concerns across backend APIs, frontend workflows, cloud integrations, background jobs, and infrastructure-as-code.

> Warning
> This repository is still in active development. Core flows are implemented and tested, but some integrations and deployment steps still require manual cloud setup, real credentials, and additional hardening before this should be treated as production-ready.

## Why This Project Is Worth Looking At

Underflow is intentionally broader than a CRUD demo. It brings together:

- Full-stack TypeScript across an Express API and React frontend
- Browser/mobile authentication flows with session invalidation and CSRF protection
- AWS-oriented backend capabilities such as AssumeRole metadata, cost sync orchestration, and SES groundwork
- Background jobs for sync and alert evaluation
- Billing-oriented flows and notification infrastructure
- Terraform-based infrastructure setup for SES and DNS delegation
- Terraform and GitHub Actions scaffolding for a first ECS/CloudFront production deployment

## What Underflow Does Today

- Auth for browser and mobile-style clients
- Workspace-scoped cost monitoring flows
- AWS account onboarding via AssumeRole metadata
- Manual and scheduled cost sync foundations
- Cost summaries, service breakdowns, and timeseries reporting
- Budget alert creation and notification feed surfaces
- SES/domain infrastructure bootstrap via Terraform

## Tech Stack

### Backend

- Node.js
- TypeScript
- Express
- PostgreSQL
- AWS SDK (STS, Cost Explorer, SES)
- Stripe

### Frontend

- React
- TypeScript
- Vite
- React Router
- Vitest + Testing Library
- Recharts

### Infrastructure

- Terraform
- Route 53
- Amazon SES

## Architecture At A Glance

- `apps/api`
  - Express API, auth/session flows, AWS integrations, background workers, DB migrations, and tests
- `apps/web`
  - React application for auth, onboarding, workspace management, AWS connection, costs, alerts, and settings
- `infra/terraform`
  - Shared infrastructure code, currently focused on SES domain setup and Route 53 delegation for a project subdomain
- `docs`
  - Additional technical documentation and development notes

For a deeper walkthrough, see [docs/architecture.md](./docs/architecture.md).

## Repository Status

This repository is best described as a development-stage, production-style showcase project.

### Stable enough to demonstrate

- Local API and frontend development workflows
- API migrations
- Automated API and frontend tests
- Auth flows
- Workspace, AWS account, cost-monitoring, and alert management UI
- SES subdomain infrastructure scaffolding

### Still in progress or requiring manual setup

- Real AWS AssumeRole and Cost Explorer validation against live accounts
- End-to-end SES production sending approval and live email delivery verification
- Production deployment topology and operations
- Final billing/provider hardening

See [docs/status-and-limitations.md](./docs/status-and-limitations.md) for a more concrete maturity summary.

## Quickstart

### Before first run

- Install Node.js 20+ and npm
- Have PostgreSQL available locally
- Create local env files from the provided examples
- Run API migrations before starting the backend
- Treat Stripe/AWS/email credentials as optional unless you are validating real integrations

### 1. Configure environment files

```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env
```

### 2. Install dependencies

```powershell
cd apps\api
npm install
cd ..\web
npm install
```

### 3. Start the backend

```powershell
cd apps\api
npm run migrate
npm run dev
```

In a second terminal, start background jobs:

```powershell
cd apps\api
npm run jobs
```

### 4. Start the frontend

```powershell
cd apps\web
npm run dev
```

Default local URLs:

- API: `http://localhost:3080`
- Web: `http://localhost:5174`

For a fuller setup guide, see [docs/local-development.md](./docs/local-development.md).

## Validation Commands

### API

```powershell
cd apps\api
npm run build
npm test
npm run test:db
```

### Web

```powershell
cd apps\web
npm run build
npm test
```

## Infrastructure And Email Notes

- SES/DNS infrastructure now lives under [`infra/terraform`](./infra/terraform)
- The current recommended pattern is a delegated subdomain such as `underflow.example.com`
- Terraform can manage:
  - Route 53 hosted zone, SES identity, DKIM, MAIL FROM, and DMARC records
  - bootstrap CI/CD infrastructure such as Terraform remote state and GitHub OIDC
  - production ECS, RDS, S3, and CloudFront deployment topology
- Parent-domain delegation and SES production-access approval still require manual AWS/DNS steps

See:

- [docs/local-development.md](./docs/local-development.md)
- [docs/production-operations.md](./docs/production-operations.md)
- [docs/production-deployment.md](./docs/production-deployment.md)
- [docs/customer-aws-onboarding.md](./docs/customer-aws-onboarding.md)
- [docs/status-and-limitations.md](./docs/status-and-limitations.md)
- [`infra/terraform/README.md`](./infra/terraform/README.md)

## Roadmap Direction

- Validate real AWS cost syncs and alert evaluation against live accounts
- Finalize SES-backed email delivery end to end
- Continue improving reliability, observability, and operational polish

## License

This project is licensed under the terms in [LICENSE](./LICENSE).
