provider "aws" {
  region = var.aws_region
}

module "ses_domain" {
  source = "../../modules/ses_domain"

  aws_region               = var.aws_region
  domain_name              = var.domain_name
  create_hosted_zone       = var.create_hosted_zone
  route53_zone_id          = var.route53_zone_id
  enable_custom_mail_from  = var.enable_custom_mail_from
  mail_from_subdomain      = var.mail_from_subdomain
  behavior_on_mx_failure   = var.behavior_on_mx_failure
  create_dmarc_record      = var.create_dmarc_record
  dmarc_policy             = var.dmarc_policy
  dmarc_rua                = var.dmarc_rua
  tags                     = var.tags
}
