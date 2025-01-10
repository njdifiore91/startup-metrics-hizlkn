# Terraform variables configuration file for staging environment
# Version: 1.0
# Terraform version: ~> 1.0

# Environment configuration - fixed as staging
variable "environment" {
  type        = string
  description = "Deployment environment name"
  default     = "staging"
}

# AWS Region configuration
variable "region" {
  type        = string
  description = "AWS region for staging environment deployment"
  default     = "us-west-2"
}

# Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for staging VPC"
  default     = "10.1.0.0/16"  # Staging VPC CIDR range
}

# Web tier configuration
variable "web_instance_type" {
  type        = string
  description = "EC2 instance type for web servers in staging"
  default     = "t3.medium"  # As per staging environment requirements
}

# API tier configuration
variable "api_instance_type" {
  type        = string
  description = "EC2 instance type for API servers in staging"
  default     = "t3.medium"  # As per staging environment requirements
}

# Database configuration
variable "db_instance_class" {
  type        = string
  description = "RDS instance class for staging environment"
  default     = "db.t3.medium"  # As per staging environment requirements
}

# Cache configuration
variable "redis_node_type" {
  type        = string
  description = "ElastiCache Redis node type for staging"
  default     = "cache.t3.medium"  # As per staging environment requirements
}

# Web tier scaling configuration - limited for staging
variable "web_min_capacity" {
  type        = number
  description = "Minimum number of web server instances in staging"
  default     = 1  # Minimal staging configuration
}

variable "web_max_capacity" {
  type        = number
  description = "Maximum number of web server instances in staging"
  default     = 3  # Limited auto-scaling for staging
}

# API tier scaling configuration - limited for staging
variable "api_min_capacity" {
  type        = number
  description = "Minimum number of API server instances in staging"
  default     = 1  # Minimal staging configuration
}

variable "api_max_capacity" {
  type        = number
  description = "Maximum number of API server instances in staging"
  default     = 3  # Limited auto-scaling for staging
}

# Backup configuration for staging
variable "db_backup_retention" {
  type        = number
  description = "Number of days to retain RDS backups in staging"
  default     = 7  # One week retention for staging
}

variable "redis_snapshot_retention" {
  type        = number
  description = "Number of days to retain Redis snapshots in staging"
  default     = 3  # Three days retention for staging
}

# High availability configuration - disabled for staging
variable "multi_az" {
  type        = bool
  description = "Multi-AZ deployment setting for staging (disabled)"
  default     = false  # Single-AZ deployment for staging
}