# Core environment configuration
variable "environment" {
  description = "Environment name for RDS resources (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}

# Instance configuration
variable "instance_class" {
  description = "RDS instance class (db.r5.xlarge for production, db.t3.medium for dev/staging)"
  type        = string
  default     = "db.t3.medium"

  validation {
    condition     = can(regex("^db\\.(t3|r5)\\.(medium|large|xlarge|2xlarge)$", var.instance_class))
    error_message = "Instance class must be a valid RDS instance type."
  }
}

variable "allocated_storage" {
  description = "Allocated storage in GB for RDS instance (min 100GB for production)"
  type        = number
  default     = 100

  validation {
    condition     = var.allocated_storage >= 20 && var.allocated_storage <= 16384
    error_message = "Storage must be between 20GB and 16384GB."
  }
}

variable "engine_version" {
  description = "PostgreSQL engine version (13.7 or higher recommended)"
  type        = string
  default     = "13.7"

  validation {
    condition     = can(regex("^13\\.[0-9]+$", var.engine_version))
    error_message = "Engine version must be PostgreSQL 13.x."
  }
}

# High availability configuration
variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability (required for production)"
  type        = bool
  default     = false
}

variable "replica_count" {
  description = "Number of read replicas to create (up to 3 for production)"
  type        = number
  default     = 0

  validation {
    condition     = var.replica_count >= 0 && var.replica_count <= 3
    error_message = "Replica count must be between 0 and 3."
  }
}

# Storage configuration
variable "storage_type" {
  description = "Storage type for RDS instance (gp3 recommended for production)"
  type        = string
  default     = "gp3"

  validation {
    condition     = can(regex("^(gp2|gp3|io1)$", var.storage_type))
    error_message = "Storage type must be gp2, gp3, or io1."
  }
}

# Backup and maintenance configuration
variable "backup_retention_period" {
  description = "Number of days to retain automated backups (min 7 for production)"
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "Backup retention must be between 1 and 35 days."
  }
}

variable "backup_window" {
  description = "Preferred backup window for RDS instance (format: hh24:mi-hh24:mi)"
  type        = string
  default     = "02:00-03:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window for RDS instance (format: ddd:hh24:mi-ddd:hh24:mi)"
  type        = string
  default     = "sun:03:00-sun:04:00"
}

# Security configuration
variable "kms_key_rotation_enabled" {
  description = "Enable automatic key rotation for KMS encryption (90 days, required for production)"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Enable deletion protection for RDS instance (required for production)"
  type        = bool
  default     = true
}

# Monitoring configuration
variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds (60s recommended for production)"
  type        = number
  default     = 60

  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be 0, 1, 5, 10, 15, 30, or 60 seconds."
  }
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights for monitoring (recommended for production)"
  type        = bool
  default     = true
}

# Network configuration
variable "subnet_group_name" {
  description = "Name of the DB subnet group for RDS instance placement"
  type        = string
}

# Database configuration
variable "parameter_group_name" {
  description = "Name of the DB parameter group for PostgreSQL configuration"
  type        = string
}

# Resource tagging
variable "tags" {
  description = "Tags to apply to all RDS resources"
  type        = map(string)
  default     = {}
}