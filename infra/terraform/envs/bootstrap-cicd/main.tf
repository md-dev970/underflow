provider "aws" {
  region = var.aws_region
}

locals {
  default_tags = merge(
    {
      project     = "underflow"
      environment = "bootstrap"
      managed     = "terraform"
    },
    var.tags,
  )
}

module "tf_state_backend" {
  source = "../../modules/tf_state_backend"

  bucket_name     = var.terraform_state_bucket_name
  lock_table_name = var.terraform_lock_table_name
  force_destroy   = var.force_destroy_state_bucket
  tags            = local.default_tags
}

module "github_oidc_role" {
  source = "../../modules/github_oidc_role"

  role_name         = var.github_actions_role_name
  github_repository = var.github_repository
  subjects          = var.github_oidc_subjects
  thumbprint_list   = var.github_oidc_thumbprints
  tags              = local.default_tags
}
