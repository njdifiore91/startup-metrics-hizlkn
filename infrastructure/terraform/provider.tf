# Provider configuration for Startup Metrics Benchmarking Platform
# Version: 1.0
# Last Updated: 2023

terraform {
  # Specify minimum Terraform version required
  required_version = ">= 1.0.0"

  # Define required providers and their versions
  required_providers {
    # AWS provider version ~> 4.0
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }

    # Random provider for generating unique identifiers
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Configure AWS provider with region and default tags
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "startup-metrics-benchmarking"
      ManagedBy   = "terraform"
      CreatedAt   = timestamp()
      Owner       = "platform-team"
      Purpose     = "metrics-platform"
    }
  }
}

# Configure random provider for resource naming
provider "random" {
  # No specific configuration needed for random provider
}