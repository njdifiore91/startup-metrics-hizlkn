# Main Terraform configuration for Startup Metrics Benchmarking Platform
# Version: 1.0
# Provider versions:
# - hashicorp/aws ~> 4.0
# - hashicorp/random ~> 3.0

terraform {
  required_version = ">= 1.0"
  
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
    # Backend configuration should be provided via backend config file
    key = "startup-metrics/terraform.tfstate"
  }
}

# Local variables
locals {
  project = "startup-metrics-benchmarking"
  default_tags = {
    Environment         = var.environment
    Project            = local.project
    ManagedBy          = "terraform"
    CostCenter         = "platform-infrastructure"
    BackupPolicy       = "required"
    SecurityCompliance = "required"
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.region
  
  default_tags {
    tags = local.default_tags
  }
}

# VPC Module - Multi-AZ Networking Infrastructure
module "vpc" {
  source = "./modules/vpc"
  
  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  project_name       = local.project
  availability_zones = data.aws_availability_zones.available.names
  
  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true
  
  tags = local.default_tags
}

# ECS Module - Container Orchestration with Auto-scaling
module "ecs" {
  source = "./modules/ecs"
  
  environment         = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  
  web_instance_type = var.web_instance_type
  api_instance_type = var.api_instance_type
  
  web_min_capacity = 2
  web_max_capacity = 10
  api_min_capacity = 2
  api_max_capacity = 8
  
  enable_auto_scaling                 = true
  health_check_grace_period          = 300
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  
  tags = local.default_tags
}

# RDS Module - Multi-AZ Database with Read Replicas
module "rds" {
  source = "./modules/rds"
  
  environment          = var.environment
  vpc_id              = module.vpc.vpc_id
  database_subnet_ids = module.vpc.database_subnet_ids
  
  instance_class           = var.db_instance_class
  backup_retention_period = 7
  multi_az                = true
  read_replica_count      = 3
  
  storage_type            = "gp3"
  allocated_storage      = 100
  max_allocated_storage  = 1000
  
  performance_insights_enabled = true
  deletion_protection         = true
  
  tags = local.default_tags
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "vpc_id" {
  description = "ID of the created VPC"
  value       = module.vpc.vpc_id
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = module.ecs.cluster_id
}

output "rds_endpoint" {
  description = "Endpoint of the primary RDS instance"
  value       = module.rds.db_endpoint
}

output "load_balancer_dns" {
  description = "DNS name of the application load balancer"
  value       = module.ecs.load_balancer_dns
}

output "read_replica_endpoints" {
  description = "Endpoints of RDS read replicas"
  value       = module.rds.read_replica_endpoints
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of database subnets"
  value       = module.vpc.database_subnet_ids
}