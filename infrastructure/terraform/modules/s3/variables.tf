variable "environment" {
  type        = string
  description = "Deployment environment identifier (dev, staging, prod) used for resource naming and configuration"
  
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "project_name" {
  type        = string
  description = "Project identifier used for resource naming and tagging, must be lowercase alphanumeric with hyphens"
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens"
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags applied to all S3 resources for organization and cost tracking"
  default     = {}
}

variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain backup files in S3 before lifecycle transition or deletion"
  default     = 30
  
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 365
    error_message = "Backup retention days must be between 1 and 365"
  }
}

variable "kms_key_deletion_window" {
  type        = number
  description = "Waiting period in days before KMS key deletion, must be between 7 and 30 days for security compliance"
  default     = 7
  
  validation {
    condition     = var.kms_key_deletion_window >= 7 && var.kms_key_deletion_window <= 30
    error_message = "KMS key deletion window must be between 7 and 30 days"
  }
}

variable "enable_versioning" {
  type        = bool
  description = "Enable versioning for S3 buckets to protect against accidental deletions and maintain file history"
  default     = true
}

variable "enable_cross_region_replication" {
  type        = bool
  description = "Enable cross-region replication for disaster recovery compliance"
  default     = false
}

variable "kms_key_rotation_days" {
  type        = number
  description = "Number of days between automatic KMS key rotations for enhanced security"
  default     = 90
  
  validation {
    condition     = var.kms_key_rotation_days >= 90 && var.kms_key_rotation_days <= 365
    error_message = "KMS key rotation period must be between 90 and 365 days"
  }
}