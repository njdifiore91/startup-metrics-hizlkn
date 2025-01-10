# Terraform AWS ECS Module Variables
# Version: ~> 1.0

# Core environment configuration
variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Network configuration
variable "vpc_id" {
  description = "ID of the VPC where ECS resources will be deployed"
  type        = string
  
  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must start with 'vpc-'."
  }
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS task deployment"
  type        = list(string)
  
  validation {
    condition     = length(var.private_subnet_ids) >= 2 && alltrue([for id in var.private_subnet_ids : can(regex("^subnet-", id))])
    error_message = "At least 2 valid subnet IDs (starting with 'subnet-') must be provided."
  }
}

# Monitoring configuration
variable "container_insights_enabled" {
  description = "Toggle for enabling detailed Container Insights monitoring"
  type        = bool
  default     = true
}

# Frontend service configuration
variable "frontend_cpu" {
  description = "CPU units allocated for frontend tasks (1 CPU = 1024 units)"
  type        = number
  default     = 1024
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.frontend_cpu)
    error_message = "Frontend CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "frontend_memory" {
  description = "Memory (MiB) allocated for frontend tasks"
  type        = number
  default     = 2048
  
  validation {
    condition     = var.frontend_memory >= 512 && var.frontend_memory <= 30720
    error_message = "Frontend memory must be between 512 and 30720 MiB."
  }
}

variable "frontend_min_capacity" {
  description = "Minimum number of frontend tasks to maintain"
  type        = number
  default     = 2
  
  validation {
    condition     = var.frontend_min_capacity >= 1 && var.frontend_min_capacity <= 10
    error_message = "Frontend minimum capacity must be between 1 and 10."
  }
}

variable "frontend_max_capacity" {
  description = "Maximum number of frontend tasks allowed"
  type        = number
  default     = 10
  
  validation {
    condition     = var.frontend_max_capacity >= 1 && var.frontend_max_capacity <= 20
    error_message = "Frontend maximum capacity must be between 1 and 20."
  }
}

# API service configuration
variable "api_cpu" {
  description = "CPU units allocated for API tasks (1 CPU = 1024 units)"
  type        = number
  default     = 2048
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.api_cpu)
    error_message = "API CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "api_memory" {
  description = "Memory (MiB) allocated for API tasks"
  type        = number
  default     = 4096
  
  validation {
    condition     = var.api_memory >= 512 && var.api_memory <= 30720
    error_message = "API memory must be between 512 and 30720 MiB."
  }
}

variable "api_min_capacity" {
  description = "Minimum number of API tasks to maintain"
  type        = number
  default     = 2
  
  validation {
    condition     = var.api_min_capacity >= 2 && var.api_min_capacity <= 8
    error_message = "API minimum capacity must be between 2 and 8."
  }
}

variable "api_max_capacity" {
  description = "Maximum number of API tasks allowed"
  type        = number
  default     = 8
  
  validation {
    condition     = var.api_max_capacity >= 2 && var.api_max_capacity <= 20
    error_message = "API maximum capacity must be between 2 and 20."
  }
}

# Health check configuration
variable "health_check_grace_period" {
  description = "Grace period in seconds before starting health checks"
  type        = number
  default     = 60
  
  validation {
    condition     = var.health_check_grace_period >= 0 && var.health_check_grace_period <= 1800
    error_message = "Health check grace period must be between 0 and 1800 seconds."
  }
}

# Resource tagging
variable "tags" {
  description = "Resource tags to apply to all ECS resources"
  type        = map(string)
  default     = {}
}