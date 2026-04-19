variable "role_name" {
  description = "IAM role name assumed by GitHub Actions."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository in owner/name format."
  type        = string
}

variable "subjects" {
  description = "Allowed OIDC token subjects."
  type        = list(string)
}

variable "thumbprint_list" {
  description = "Thumbprints for the GitHub OIDC provider."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "tags" {
  description = "Tags applied to IAM resources."
  type        = map(string)
  default     = {}
}
