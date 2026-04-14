variable "domain_name" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "create_hosted_zone" {
  type    = bool
  default = true
}

variable "route53_zone_id" {
  type    = string
  default = null
}

variable "enable_custom_mail_from" {
  type    = bool
  default = true
}

variable "mail_from_subdomain" {
  type    = string
  default = "bounce"
}

variable "behavior_on_mx_failure" {
  type    = string
  default = "UseDefaultValue"
}

variable "create_dmarc_record" {
  type    = bool
  default = true
}

variable "dmarc_policy" {
  type    = string
  default = "none"
}

variable "dmarc_rua" {
  type    = string
  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
