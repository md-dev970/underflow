terraform {
  required_providers {
    archive = {
      source = "hashicorp/archive"
    }

    aws = {
      source = "hashicorp/aws"
      configuration_aliases = [
        aws.us_east_1,
      ]
    }
  }
}
