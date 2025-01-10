variable "environment" {
  type        = string
  description = "Environment name for resource naming and tagging (dev/staging/prod)"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "redis_node_type" {
  type        = string
  description = "AWS ElastiCache node type specification (must be from r5 family for production use)"
  default     = "cache.r5.large"

  validation {
    condition     = can(regex("^cache\\.r5\\.", var.redis_node_type))
    error_message = "Redis node type must be from the r5 family (e.g., cache.r5.large)."
  }
}

variable "redis_cluster_size" {
  type        = number
  description = "Number of nodes in Redis cluster (1-6 nodes)"
  default     = 2

  validation {
    condition     = var.redis_cluster_size >= 1 && var.redis_cluster_size <= 6
    error_message = "Redis cluster size must be between 1 and 6 nodes."
  }
}

variable "redis_snapshot_retention" {
  type        = number
  description = "Number of days to retain Redis snapshots (0-35 days)"
  default     = 7

  validation {
    condition     = var.redis_snapshot_retention >= 0 && var.redis_snapshot_retention <= 35
    error_message = "Redis snapshot retention must be between 0 and 35 days."
  }
}

variable "multi_az_enabled" {
  type        = bool
  description = "Enable/disable multi-AZ deployment for high availability"
  default     = true
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where Redis cluster will be deployed"

  validation {
    condition     = can(regex("^vpc-[a-f0-9]{8,17}$", var.vpc_id))
    error_message = "VPC ID must be a valid vpc-* identifier."
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for Redis cluster deployment (minimum 2 for multi-AZ)"

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for Redis cluster deployment."
  }

  validation {
    condition     = can([for s in var.subnet_ids : regex("^subnet-[a-f0-9]{8,17}$", s)])
    error_message = "All subnet IDs must be valid subnet-* identifiers."
  }
}

variable "allowed_security_group_ids" {
  type        = list(string)
  description = "List of security group IDs allowed to access Redis cluster"
  default     = []

  validation {
    condition     = can([for sg in var.allowed_security_group_ids : regex("^sg-[a-f0-9]{8,17}$", sg)])
    error_message = "All security group IDs must be valid sg-* identifiers."
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for Redis cluster"
  default     = {}

  validation {
    condition     = contains(keys(var.tags), "Name") && contains(keys(var.tags), "Environment") && contains(keys(var.tags), "Service")
    error_message = "Tags must include at least Name, Environment, and Service tags."
  }

  validation {
    condition     = alltrue([for k, v in var.tags : length(v) > 0])
    error_message = "All tag values must be non-empty strings."
  }
}