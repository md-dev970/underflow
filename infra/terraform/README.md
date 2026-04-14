# Underflow Terraform

This directory is the root for shared infrastructure code.

## Layout

- `modules/`
  - Reusable Terraform modules.
- `envs/`
  - Concrete deployable environments that compose modules with real values.

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

1. Copy `envs/shared-email/terraform.tfvars.example` to `terraform.tfvars`
2. Fill in your real domain and SES region
3. Run `terraform init`
4. Run `terraform plan`
5. Run `terraform apply`
6. Update your nameservers at Spaceship to the Route 53 nameservers from the outputs
7. Wait for DNS propagation
8. Confirm the SES identity becomes verified
9. Request SES production access manually in the AWS account/region

## Important notes

- Domain registration stays at Spaceship. This setup only manages DNS in Route 53.
- SES production access is still a manual AWS account step.
- Start with one SES region and keep your sending identity there.
