# Development environment variables for Startup Metrics Benchmarking Platform
# Version: 1.0
# Terraform version: ~> 1.0

# Environment identifier
variable "environment" {
  type        = string
  description = "Development environment identifier"
  default     = "dev"
}

# Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for development VPC"
  default     = "10.0.0.0/16"
}

# Instance type configurations for development
variable "web_instance_type" {
  type        = string
  description = "EC2 instance type for web servers in development"
  default     = "t3.medium"
}

variable "api_instance_type" {
  type        = string
  description = "EC2 instance type for API servers in development"
  default     = "t3.large"
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class for development database"
  default     = "db.t3.medium"
}

variable "redis_node_type" {
  type        = string
  description = "ElastiCache node type for development Redis"
  default     = "cache.t3.medium"
}

# Scaling configurations for development
variable "web_min_capacity" {
  type        = number
  description = "Minimum number of web server instances in development"
  default     = 1
}

variable "web_max_capacity" {
  type        = number
  description = "Maximum number of web server instances in development"
  default     = 2
}

variable "api_min_capacity" {
  type        = number
  description = "Minimum number of API server instances in development"
  default     = 1
}

variable "api_max_capacity" {
  type        = number
  description = "Maximum number of API server instances in development"
  default     = 2
}

# High availability configuration for development
variable "multi_az" {
  type        = bool
  description = "Multi-AZ deployment flag for development (disabled)"
  default     = false
}

# Availability zones for development
variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for development (single AZ)"
  default     = ["us-east-1a"]
}

# Development-specific features
variable "enable_debug" {
  type        = bool
  description = "Enable debug mode in development environment"
  default     = true
}

# Backup configuration for development
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain backups in development"
  default     = 1
}