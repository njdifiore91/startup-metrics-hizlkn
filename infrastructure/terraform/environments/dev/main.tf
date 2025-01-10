# Development environment Terraform configuration for Startup Metrics Benchmarking Platform
# Version: 1.0
# Terraform version: ~> 1.0

# Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Local variables
locals {
  default_tags = {
    Environment = var.environment
    Project     = "startup-metrics-benchmarking"
    ManagedBy   = "terraform"
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = local.default_tags
  }
}

# VPC Module - Development Configuration
module "vpc" {
  source = "../../modules/vpc"

  environment        = var.environment
  vpc_cidr          = var.vpc_cidr
  single_nat_gateway = true # Cost optimization for development

  tags = local.default_tags
}

# ECS Module - Development Configuration
module "ecs" {
  source = "../../modules/ecs"

  environment         = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  # Development-specific instance configurations
  web_instance_type  = var.web_instance_type
  api_instance_type  = var.api_instance_type
  web_min_capacity   = var.web_min_capacity
  web_max_capacity   = var.web_max_capacity
  api_min_capacity   = var.api_min_capacity
  api_max_capacity   = var.api_max_capacity

  tags = local.default_tags
}

# RDS Module - Development Configuration
module "rds" {
  source = "../../modules/rds"

  environment          = var.environment
  vpc_id              = module.vpc.vpc_id
  database_subnet_ids = module.vpc.database_subnet_ids
  
  # Development-specific database configurations
  instance_class         = var.db_instance_class
  multi_az              = false # Single AZ for development
  backup_retention_days = 7     # Minimal backup retention for development
  
  tags = local.default_tags
}

# Redis Module - Development Configuration
module "redis" {
  source = "../../modules/redis"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  
  # Development-specific Redis configurations
  node_type               = var.redis_node_type
  multi_az_enabled        = false # Single AZ for development
  snapshot_retention_days = 7     # Minimal snapshot retention for development
  
  tags = local.default_tags
}

# Outputs
output "vpc_id" {
  description = "Development VPC ID"
  value       = module.vpc.vpc_id
}

output "ecs_cluster_id" {
  description = "Development ECS Cluster ID"
  value       = module.ecs.cluster_id
}

output "rds_endpoint" {
  description = "Development RDS endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Development Redis endpoint"
  value       = module.redis.redis_endpoint
  sensitive   = true
}