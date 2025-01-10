# Backend configuration for Startup Metrics Benchmarking Platform
# Terraform version: ~> 1.0
# Implements secure remote state storage using AWS S3 and DynamoDB state locking

terraform {
  backend "s3" {
    # S3 bucket for storing terraform state files
    bucket = "startup-metrics-benchmarking-tfstate"
    
    # Dynamic state file path based on environment
    key = "env/${var.environment}/terraform.tfstate"
    
    # AWS region for state storage
    region = "us-east-1"
    
    # Enable state file encryption at rest
    encrypt = true
    
    # DynamoDB table for state locking
    dynamodb_table = "startup-metrics-benchmarking-tfstate-lock"
    
    # KMS key for server-side encryption
    kms_key_id = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
    
    # Workspace prefix for state organization
    workspace_key_prefix = "workspace"
    
    # Enable versioning for state history
    versioning = true
    
    # Force SSL/TLS for state access
    force_ssl = true
    
    # Enable server-side encryption with AWS KMS
    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          sse_algorithm = "aws:kms"
        }
      }
    }
  }
}