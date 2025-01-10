# Terraform variables configuration file for Startup Metrics Benchmarking Platform
# Version: 1.0
# Terraform version: ~> 1.0

# Environment configuration
variable "environment" {
  type        = string
  description = "Target deployment environment (dev/staging/prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# AWS Region configuration
variable "region" {
  type        = string
  description = "AWS region for resource deployment"
  validation {
    condition     = can(regex("^(us|eu|ap|sa|ca|me|af)-(north|south|east|west|central)-[1-9]$", var.region))
    error_message = "Must be a valid AWS region identifier."
  }
}

# Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

# Web tier configuration
variable "web_instance_type" {
  type        = string
  description = "EC2 instance type for web servers"
  validation {
    condition     = can(regex("^t3\\.(medium|large|xlarge)$", var.web_instance_type))
    error_message = "Web instance type must be one of: t3.medium, t3.large, t3.xlarge."
  }
}

# API tier configuration
variable "api_instance_type" {
  type        = string
  description = "EC2 instance type for API servers"
  validation {
    condition     = can(regex("^t3\\.(large|xlarge|2xlarge)$", var.api_instance_type))
    error_message = "API instance type must be one of: t3.large, t3.xlarge, t3.2xlarge."
  }
}

# Database configuration
variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
  validation {
    condition     = can(regex("^db\\.r5\\.(large|xlarge|2xlarge|4xlarge)$", var.db_instance_class))
    error_message = "DB instance class must be one of: db.r5.large, db.r5.xlarge, db.r5.2xlarge, db.r5.4xlarge."
  }
}

# Cache configuration
variable "redis_node_type" {
  type        = string
  description = "ElastiCache Redis node type"
  validation {
    condition     = can(regex("^cache\\.(t3\\.medium|r5\\.(large|xlarge))$", var.redis_node_type))
    error_message = "Redis node type must be one of: cache.t3.medium, cache.r5.large, cache.r5.xlarge."
  }
}

# Web tier scaling configuration
variable "web_min_capacity" {
  type        = number
  description = "Minimum number of web server instances"
  validation {
    condition     = var.web_min_capacity >= 1 && var.web_min_capacity <= 5
    error_message = "Web minimum capacity must be between 1 and 5."
  }
}

variable "web_max_capacity" {
  type        = number
  description = "Maximum number of web server instances"
  validation {
    condition     = var.web_max_capacity >= 2 && var.web_max_capacity <= 10
    error_message = "Web maximum capacity must be between 2 and 10."
  }
}

# API tier scaling configuration
variable "api_min_capacity" {
  type        = number
  description = "Minimum number of API server instances"
  validation {
    condition     = var.api_min_capacity >= 2 && var.api_min_capacity <= 4
    error_message = "API minimum capacity must be between 2 and 4."
  }
}

variable "api_max_capacity" {
  type        = number
  description = "Maximum number of API server instances"
  validation {
    condition     = var.api_max_capacity >= 4 && var.api_max_capacity <= 8
    error_message = "API maximum capacity must be between 4 and 8."
  }
}

# Backup configuration
variable "db_backup_retention" {
  type        = number
  description = "Number of days to retain RDS backups"
  validation {
    condition     = var.db_backup_retention >= 7 && var.db_backup_retention <= 35
    error_message = "DB backup retention must be between 7 and 35 days."
  }
}

variable "redis_snapshot_retention" {
  type        = number
  description = "Number of days to retain Redis snapshots"
  validation {
    condition     = var.redis_snapshot_retention >= 7 && var.redis_snapshot_retention <= 35
    error_message = "Redis snapshot retention must be between 7 and 35 days."
  }
}

# High availability configuration
variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
}