output "domain_name" {
  value = var.domain_name
}

output "route53_zone_id" {
  value = local.zone_id
}

output "route53_name_servers" {
  value = var.create_hosted_zone ? aws_route53_zone.this[0].name_servers : []
}

output "ses_identity_arn" {
  value = aws_ses_domain_identity.this.arn
}

output "ses_verification_token" {
  value = aws_ses_domain_identity.this.verification_token
}

output "mail_from_domain" {
  value = var.enable_custom_mail_from ? local.mail_from_domain : null
}

output "dkim_record_names" {
  value = [for record in aws_route53_record.dkim : record.name]
}
