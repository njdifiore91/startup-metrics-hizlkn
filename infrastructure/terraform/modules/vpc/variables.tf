# terraform ~> 1.0

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC (must be /16 to /24 range for appropriate subnet allocation)"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/([16-24])$", var.vpc_cidr))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block in the range /16 to /24."
  }
}

variable "environment" {
  type        = string
  description = "Environment name for resource tagging and isolation (dev/staging/prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "availability_zones" {
  type        = list(string)
  description = "List of AWS availability zones for VPC subnet placement"

  validation {
    condition     = length(var.availability_zones) >= 2 && length(var.availability_zones) <= 3
    error_message = "Must specify between 2 and 3 availability zones for high availability."
  }

  validation {
    condition     = alltrue([for az in var.availability_zones : can(regex("^[a-z]{2}-[a-z]+-[0-9][a-z]$", az))])
    error_message = "Availability zones must be valid AWS AZ names (e.g., us-east-1a)."
  }
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets (one per AZ, must be within VPC CIDR)"

  validation {
    condition     = length(var.public_subnet_cidrs) >= 2 && length(var.public_subnet_cidrs) <= 3
    error_message = "Must specify between 2 and 3 public subnet CIDRs matching the number of AZs."
  }

  validation {
    condition     = alltrue([for cidr in var.public_subnet_cidrs : can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/([0-9]{1,2})$", cidr))])
    error_message = "Public subnet CIDRs must be valid IPv4 CIDR blocks."
  }
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets (one per AZ, must be within VPC CIDR)"

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2 && length(var.private_subnet_cidrs) <= 3
    error_message = "Must specify between 2 and 3 private subnet CIDRs matching the number of AZs."
  }

  validation {
    condition     = alltrue([for cidr in var.private_subnet_cidrs : can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/([0-9]{1,2})$", cidr))])
    error_message = "Private subnet CIDRs must be valid IPv4 CIDR blocks."
  }
}

variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for database subnets (one per AZ, must be within VPC CIDR)"

  validation {
    condition     = length(var.database_subnet_cidrs) >= 2 && length(var.database_subnet_cidrs) <= 3
    error_message = "Must specify between 2 and 3 database subnet CIDRs matching the number of AZs."
  }

  validation {
    condition     = alltrue([for cidr in var.database_subnet_cidrs : can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/([0-9]{1,2})$", cidr))])
    error_message = "Database subnet CIDRs must be valid IPv4 CIDR blocks."
  }
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT Gateway for private subnet internet access"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for cost tracking and organization"
  default     = {}

  validation {
    condition     = can(lookup(var.tags, "Environment", null))
    error_message = "Tags must include an 'Environment' key."
  }
}