# Production environment variables for Startup Metrics Benchmarking Platform
# Version: 1.0
# Terraform version: ~> 1.0

# AWS Region configuration
variable "aws_region" {
  type        = string
  description = "AWS region for production environment deployment"
  default     = "us-west-2"
}

# Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for production VPC network"
  default     = "10.0.0.0/16"
}

# Web tier configuration
variable "web_instance_type" {
  type        = string
  description = "EC2 instance type for production web servers"
  default     = "t3.large"
}

# API tier configuration
variable "api_instance_type" {
  type        = string
  description = "EC2 instance type for production API servers"
  default     = "t3.large"
}

# Database configuration
variable "db_instance_class" {
  type        = string
  description = "RDS instance class for production PostgreSQL database"
  default     = "db.r5.large"
}

# Cache configuration
variable "redis_node_type" {
  type        = string
  description = "ElastiCache node type for production Redis cluster"
  default     = "cache.r5.large"
}

# Web tier scaling configuration
variable "web_min_capacity" {
  type        = number
  description = "Minimum number of web server instances in production"
  default     = 2
}

variable "web_max_capacity" {
  type        = number
  description = "Maximum number of web server instances in production"
  default     = 10
}

# API tier scaling configuration
variable "api_min_capacity" {
  type        = number
  description = "Minimum number of API server instances in production"
  default     = 2
}

variable "api_max_capacity" {
  type        = number
  description = "Maximum number of API server instances in production"
  default     = 8
}

# Backup configuration
variable "db_backup_retention" {
  type        = number
  description = "Number of days to retain RDS backups in production"
  default     = 30
}

variable "redis_snapshot_retention" {
  type        = number
  description = "Number of days to retain Redis snapshots in production"
  default     = 7
}

# High availability configuration
variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability in production"
  default     = true
}