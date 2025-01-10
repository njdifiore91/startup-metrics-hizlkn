# Core Terraform functionality for variable definitions
terraform {
  required_version = "~> 1.0"
}

variable "project_name" {
  type        = string
  description = "Name of the project for resource naming"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must be lowercase alphanumeric with hyphens only."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "domain_name" {
  type        = string
  description = "Custom domain name for CloudFront distribution"

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}$", var.domain_name))
    error_message = "Domain name must be in a valid format (e.g., example.com)."
  }
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of ACM certificate for SSL/TLS"

  validation {
    condition     = can(regex("^arn:aws:acm:[a-z0-9-]+:[0-9]{12}:certificate/[a-zA-Z0-9-]+$", var.acm_certificate_arn))
    error_message = "ACM certificate ARN must be in a valid format."
  }
}

variable "minimum_protocol_version" {
  type        = string
  description = "Minimum TLS version for viewer connections"
  default     = "TLSv1.3"

  validation {
    condition     = can(regex("^(TLSv1.2_2021|TLSv1.3)$", var.minimum_protocol_version))
    error_message = "Minimum protocol version must be one of: TLSv1.2_2021, TLSv1.3."
  }
}

variable "price_class" {
  type        = string
  description = "CloudFront distribution price class"
  default     = "PriceClass_100"

  validation {
    condition     = can(regex("^PriceClass_(100|200|All)$", var.price_class))
    error_message = "Price class must be one of: PriceClass_100, PriceClass_200, PriceClass_All."
  }
}

variable "default_root_object" {
  type        = string
  description = "Default root object for the distribution"
  default     = "index.html"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-_./]+$", var.default_root_object))
    error_message = "Default root object must be a valid file path."
  }
}

variable "error_response_page_path" {
  type        = string
  description = "Path to custom error page"
  default     = "/index.html"

  validation {
    condition     = can(regex("^/[a-zA-Z0-9-_./]+$", var.error_response_page_path))
    error_message = "Error response page path must be a valid file path starting with '/'."
  }
}

variable "cache_policy_settings" {
  type = object({
    min_ttl     = number
    default_ttl = number
    max_ttl     = number
    headers     = list(string)
    cookies     = list(string)
    query_strings = bool
  })
  description = "Cache policy configuration for the distribution"

  default = {
    min_ttl       = 0
    default_ttl   = 3600    # 1 hour
    max_ttl       = 86400   # 24 hours
    headers       = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method", "Authorization"]
    cookies       = ["none"]
    query_strings = false
  }

  validation {
    condition     = var.cache_policy_settings.min_ttl >= 0
    error_message = "Minimum TTL must be greater than or equal to 0."
  }

  validation {
    condition     = var.cache_policy_settings.default_ttl >= var.cache_policy_settings.min_ttl
    error_message = "Default TTL must be greater than or equal to minimum TTL."
  }

  validation {
    condition     = var.cache_policy_settings.max_ttl >= var.cache_policy_settings.default_ttl
    error_message = "Maximum TTL must be greater than or equal to default TTL."
  }

  validation {
    condition     = alltrue([for header in var.cache_policy_settings.headers : can(regex("^[a-zA-Z0-9-]+$", header))])
    error_message = "Headers must be valid HTTP header names."
  }

  validation {
    condition     = alltrue([for cookie in var.cache_policy_settings.cookies : can(regex("^[a-zA-Z0-9-_]+$", cookie)) || cookie == "none"])
    error_message = "Cookies must be valid cookie names or 'none'."
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for the CloudFront distribution"
  default     = {}

  validation {
    condition     = alltrue([for k, v in var.tags : can(regex("^[a-zA-Z0-9-_]+$", k)) && can(regex("^[a-zA-Z0-9-_]+$", v))])
    error_message = "Tags must contain only alphanumeric characters, hyphens, and underscores."
  }
}