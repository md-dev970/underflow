# Underflow Terraform

This directory is the root for shared infrastructure code.

## Layout

- `modules/`
  - Reusable Terraform modules.
- `envs/`
  - Concrete deployable environments that compose modules with real values.

## Environments

### `envs/bootstrap-cicd`

One-time bootstrap environment for:

- Terraform remote state bucket
- Terraform DynamoDB lock table
- GitHub OIDC deploy role

Apply this first before wiring GitHub Actions or initializing the production backend.

### `envs/production`

Production application environment for:

- VPC, subnets, and security groups
- ECS Fargate API + worker services
- ALB for the API origin
- RDS PostgreSQL
- S3 web bucket
- CloudFront distribution with `/api/*` path routing
- ACM certificate and Route 53 alias records

## SES Domain Bootstrap

The first environment included here is:

- `envs/shared-email`

It provisions:

- a Route 53 hosted zone for your domain, or uses an existing zone
- an SES domain identity
- Easy DKIM DNS records
- optional custom `MAIL FROM` DNS records
- optional DMARC record

## Recommended flow

1. Apply `envs/shared-email` to establish SES and Route 53 email identity support.
2. Apply `envs/bootstrap-cicd` to create the remote state backend and GitHub OIDC deploy role.
3. Configure GitHub Actions variables/secrets using the bootstrap outputs.
4. Initialize `envs/production` with the generated S3 backend configuration.
5. Run the production deploy workflow, or perform the equivalent local Terraform/app rollout for the first deployment.

## Important notes

- Domain registration stays at Spaceship. This setup only manages DNS in Route 53.
- SES production access is still a manual AWS account step.
- Start with one SES region and keep your sending identity there.
- CloudFront certificates must be created in `us-east-1`, even if the rest of the stack lives elsewhere.
- The production design uses one public hostname with path-based routing:
  - `/` for the web app
  - `/api/*` for the API
