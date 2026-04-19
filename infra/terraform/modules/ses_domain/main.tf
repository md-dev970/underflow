locals {
  zone_id          = var.create_hosted_zone ? aws_route53_zone.this[0].zone_id : var.route53_zone_id
  mail_from_domain = "${var.mail_from_subdomain}.${var.domain_name}"
  dmarc_record = trimspace(
    join(
      "; ",
      compact([
        "v=DMARC1",
        "p=${var.dmarc_policy}",
        var.dmarc_rua != null ? "rua=mailto:${var.dmarc_rua}" : null,
      ]),
    ),
  )
}

resource "aws_route53_zone" "this" {
  count = var.create_hosted_zone ? 1 : 0

  name = var.domain_name
  tags = var.tags
}

resource "aws_ses_domain_identity" "this" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "this" {
  domain = aws_ses_domain_identity.this.domain
}

resource "aws_route53_record" "dkim" {
  count = 3

  zone_id = local.zone_id
  name    = "${aws_ses_domain_dkim.this.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["${aws_ses_domain_dkim.this.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_ses_domain_identity_verification" "this" {
  domain = aws_ses_domain_identity.this.id

  depends_on = [aws_route53_record.dkim]
}

resource "aws_ses_domain_mail_from" "this" {
  count = var.enable_custom_mail_from ? 1 : 0

  domain                 = aws_ses_domain_identity.this.domain
  mail_from_domain       = local.mail_from_domain
  behavior_on_mx_failure = var.behavior_on_mx_failure
}

resource "aws_route53_record" "mail_from_mx" {
  count = var.enable_custom_mail_from ? 1 : 0

  zone_id = local.zone_id
  name    = local.mail_from_domain
  type    = "MX"
  ttl     = 300
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "mail_from_spf" {
  count = var.enable_custom_mail_from ? 1 : 0

  zone_id = local.zone_id
  name    = local.mail_from_domain
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com -all"]
}

resource "aws_route53_record" "dmarc" {
  count = var.create_dmarc_record ? 1 : 0

  zone_id = local.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 300
  records = [local.dmarc_record]
}
