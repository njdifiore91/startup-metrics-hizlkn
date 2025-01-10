# Production environment Terraform configuration for Startup Metrics Benchmarking Platform
# Version: 1.0
# Terraform version: ~> 1.0

terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "startup-metrics-tfstate-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Local variables
locals {
  environment = "prod"
  project     = "startup-metrics-benchmarking"
  default_tags = {
    Environment       = "prod"
    Project          = "startup-metrics-benchmarking"
    ManagedBy        = "terraform"
    BackupEnabled    = "true"
    MonitoringEnabled = "true"
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = local.default_tags
  }
  
  assume_role {
    role_arn = "arn:aws:iam::PRODUCTION_ACCOUNT_ID:role/TerraformExecutionRole"
  }
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"
  
  environment         = local.environment
  vpc_cidr           = var.vpc_cidr
  project_name       = local.project
  multi_az           = true
  enable_flow_logs   = true
  enable_vpc_endpoints = true
  
  tags = merge(local.default_tags, {
    Name = "${local.project}-${local.environment}-vpc"
  })
}

# ECS Module
module "ecs" {
  source = "../../modules/ecs"
  
  environment               = local.environment
  vpc_id                   = module.vpc.vpc_id
  private_subnet_ids       = module.vpc.private_subnet_ids
  web_instance_type        = var.web_instance_type
  api_instance_type        = var.api_instance_type
  web_min_capacity         = 2
  web_max_capacity         = 10
  api_min_capacity         = 2
  api_max_capacity         = 8
  enable_detailed_monitoring = true
  enable_container_insights = true
  
  tags = merge(local.default_tags, {
    Name = "${local.project}-${local.environment}-ecs"
  })
}

# RDS Module
module "rds" {
  source = "../../modules/rds"
  
  environment                  = local.environment
  vpc_id                      = module.vpc.vpc_id
  database_subnet_ids         = module.vpc.database_subnet_ids
  instance_class              = var.db_instance_class
  backup_retention_period     = var.backup_retention_days
  multi_az                    = true
  monitoring_interval         = var.monitoring_interval
  performance_insights_enabled = true
  read_replica_count          = 3
  
  tags = merge(local.default_tags, {
    Name = "${local.project}-${local.environment}-rds"
  })
}

# Redis Module
module "redis" {
  source = "../../modules/redis"
  
  environment                 = local.environment
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.private_subnet_ids
  node_type                  = var.redis_node_type
  snapshot_retention         = 7
  multi_az_enabled          = true
  automatic_failover_enabled = true
  cluster_mode_enabled      = true
  num_cache_clusters        = 3
  
  tags = merge(local.default_tags, {
    Name = "${local.project}-${local.environment}-redis"
  })
}

# Outputs
output "vpc_id" {
  description = "Production VPC identifier"
  value       = module.vpc.vpc_id
}

output "ecs_cluster_id" {
  description = "Production ECS cluster identifier"
  value       = module.ecs.cluster_id
}

output "rds_endpoints" {
  description = "Production RDS endpoints"
  value = {
    primary  = module.rds.db_endpoint
    replicas = module.rds.read_replica_endpoints
  }
}

output "redis_endpoints" {
  description = "Production Redis endpoints"
  value = {
    primary = module.redis.primary_endpoint_address
    reader  = module.redis.reader_endpoint_address
  }
}