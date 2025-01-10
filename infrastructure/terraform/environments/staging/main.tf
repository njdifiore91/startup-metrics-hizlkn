# Startup Metrics Benchmarking Platform - Staging Environment Configuration
# Terraform Version: >= 1.0.0
# AWS Provider Version: ~> 4.0
# Random Provider Version: ~> 3.0

terraform {
  required_version = ">= 1.0.0"
  
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

  backend "s3" {
    bucket         = "startup-metrics-benchmarking-tfstate-staging"
    key            = "staging/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-lock-staging"
  }
}

# Local variables
locals {
  project      = "startup-metrics-benchmarking"
  default_tags = {
    Environment = var.environment
    Project     = local.project
    ManagedBy   = "terraform"
    EnableDebug = "true"
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.region
  
  default_tags {
    tags = local.default_tags
  }

  assume_role {
    role_arn     = var.terraform_role_arn
    session_name = "terraform-staging"
  }
}

# VPC Module - Single AZ Configuration for Staging
module "vpc" {
  source = "../../modules/vpc"

  environment     = var.environment
  vpc_cidr        = var.vpc_cidr
  project_name    = local.project
  single_az_mode  = true
  enable_flow_logs = true

  tags = merge(local.default_tags, {
    Component = "networking"
  })
}

# ECS Module - Development-friendly Configuration
module "ecs" {
  source = "../../modules/ecs"

  environment            = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  web_instance_type     = "t3.medium"
  api_instance_type     = "t3.medium"
  web_min_capacity      = 1
  web_max_capacity      = 3
  api_min_capacity      = 1
  api_max_capacity      = 3
  enable_container_insights = true
  enable_execute_command   = true

  tags = merge(local.default_tags, {
    Component = "containers"
  })
}

# RDS Module - Single AZ with Development Parameters
module "rds" {
  source = "../../modules/rds"

  environment               = var.environment
  vpc_id                   = module.vpc.vpc_id
  database_subnet_ids      = module.vpc.database_subnet_ids
  instance_class           = "db.t3.medium"
  backup_retention_period  = 7
  multi_az                 = false
  performance_insights_enabled = true
  allow_major_version_upgrade = true
  debug_logging_enabled    = true

  tags = merge(local.default_tags, {
    Component = "database"
  })
}

# Redis Module - Single Node with Development Access
module "redis" {
  source = "../../modules/redis"

  environment          = var.environment
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  node_type           = "cache.t3.medium"
  cluster_size        = 1
  snapshot_retention  = 3
  multi_az_enabled    = false
  allow_debug_access  = true
  enable_cloudwatch_logs = true

  tags = merge(local.default_tags, {
    Component = "cache"
  })
}

# Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "ecs_cluster_id" {
  description = "The ID of the ECS cluster"
  value       = module.ecs.cluster_id
}

output "rds_endpoint" {
  description = "The endpoint of the RDS instance"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "The endpoint of the Redis cluster"
  value       = module.redis.primary_endpoint_address
  sensitive   = true
}

output "private_subnet_ids" {
  description = "The IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "The IDs of the database subnets"
  value       = module.vpc.database_subnet_ids
}

output "ecs_service_names" {
  description = "The names of the ECS services"
  value       = module.ecs.service_names
}

output "cloudwatch_log_groups" {
  description = "The CloudWatch log groups for the environment"
  value = {
    ecs = module.ecs.log_groups
    rds = module.rds.log_group_name
    redis = module.redis.log_group_name
  }
}