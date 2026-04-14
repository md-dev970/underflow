output "domain_name" {
  value = module.ses_domain.domain_name
}

output "route53_zone_id" {
  value = module.ses_domain.route53_zone_id
}

output "route53_name_servers" {
  value = module.ses_domain.route53_name_servers
}

output "ses_identity_arn" {
  value = module.ses_domain.ses_identity_arn
}

output "mail_from_domain" {
  value = module.ses_domain.mail_from_domain
}

output "dkim_record_names" {
  value = module.ses_domain.dkim_record_names
}
