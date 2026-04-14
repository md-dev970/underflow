# Local Development

This guide documents the current local workflow for running Underflow end to end.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL available locally
- Two terminals minimum if you want to run API + worker + web comfortably

Optional, depending on what you want to test:

- Stripe test credentials
- AWS credentials for real integration validation
- SES-ready domain/subdomain setup if validating live email flows

## Environment Files

### API

Create a local env file:

```powershell
Copy-Item apps\api\.env.example apps\api\.env
```

Important API values:

- `DATABASE_URL`
- `TEST_DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CSRF_SECRET`
- `CLIENT_URL`

Optional real-integration values:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `AWS_REGION`
- `AWS_SES_REGION`
- `AWS_SES_ACCESS_KEY_ID`
- `AWS_SES_SECRET_ACCESS_KEY`
- `EMAIL_PROVIDER`
- `ALERT_EMAIL_FROM`
- `AUTH_EMAIL_FROM`

By default, the example file is set up for local development-oriented behavior and keeps billing disabled.

### Web

Create a local env file:

```powershell
Copy-Item apps\web\.env.example apps\web\.env
```

Default frontend config points the web app at the local API:

- `VITE_API_URL=http://localhost:3000/api/v1`

## Install Dependencies

### API

```powershell
cd apps\api
npm install
```

### Web

```powershell
cd apps\web
npm install
```

## Database Setup

Underflow now uses migrations for the API, not raw schema application as the primary flow.

Run:

```powershell
cd apps\api
npm run migrate
```

Make sure:

- `DATABASE_URL` points at a writable PostgreSQL database
- `TEST_DATABASE_URL` points at a separate test database

## Start The App Locally

### API server

```powershell
cd apps\api
npm run dev
```

### Background jobs worker

```powershell
cd apps\api
npm run jobs
```

### Frontend

```powershell
cd apps\web
npm run dev
```

## Local URLs

- Web: `http://localhost:5173`
- API: `http://localhost:3000`

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

## SES / Domain Development Notes

Live SES validation is not required for normal local development.

If you do want to validate the real email path:

- use the Terraform under `infra/terraform`
- configure a delegated project subdomain such as `underflow.example.com`
- add manual `NS` delegation in the parent DNS zone
- wait for DKIM/identity verification
- request SES production access in the AWS account/region

Important:

- Terraform can provision the Route 53 zone and SES records
- Terraform does not replace the manual parent-zone delegation step
- SES production access is still an account-level manual approval step

## Before Pushing Public Changes

Run these checks:

```powershell
git status --short
```

Confirm that you are not pushing:

- `.env` files
- `node_modules`
- `dist`
- Terraform state or plan files
- other local-only generated artifacts
