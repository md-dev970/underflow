# Isolated API benchmark infrastructure

This Terraform root owns only the disposable `underflow-api-bench-<id>` environment. It uses local state in this directory and has no backend, module, data source, or state reference to the production stack. Never run these commands from `envs/production`.

Create an ignored `terraform.tfvars` from the example. `load_test_cidr` is required and rejects `0.0.0.0/0`; use the load generator's public `/32`. `image_tag` must be the Git SHA used to build the API image.

Before any apply, run the validation and full-plan checks documented in [`benchmarks/underflow-api/README.md`](../../../../benchmarks/underflow-api/README.md). The first apply targets only this root's ECR repository so an immutable commit-tagged image can be pushed. After the push, run and review a fresh full plan before the full apply.

All secret values are generated, stored in local Terraform state, and injected from one disposable Secrets Manager secret. State and `.tfvars` are ignored and must never be committed. The secret has zero-day recovery, ECR uses `force_delete`, and RDS has no backups, final snapshot, public access, Multi-AZ, or deletion protection.
