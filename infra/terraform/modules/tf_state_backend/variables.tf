variable "bucket_name" {
  description = "S3 bucket name for Terraform remote state."
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table name for Terraform state locking."
  type        = string
}

variable "force_destroy" {
  description = "Whether to allow force-destroying the remote state bucket."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to remote-state resources."
  type        = map(string)
  default     = {}
}
