# Production environment Terraform variable definitions
# Version: 1.0
# Terraform version: ~> 1.0

# Environment and region configuration
environment = "prod"
region     = "us-west-2"

# Network configuration
vpc_cidr = "10.0.0.0/16"

# Instance type configuration
web_instance_type = "t3.large"
api_instance_type = "t3.large"
db_instance_class = "db.r5.xlarge"
redis_node_type   = "cache.r5.large"

# Scaling configuration
web_min_capacity = 2
web_max_capacity = 10
api_min_capacity = 2
api_max_capacity = 8

# Backup retention configuration
db_backup_retention      = 30
redis_snapshot_retention = 30

# High availability configuration
multi_az = true

# ECS configuration
ecs_settings = {
  container_insights_enabled     = true
  frontend_cpu                  = 1024  # 1 vCPU
  frontend_memory              = 2048  # 2 GB
  frontend_min_capacity        = 2
  frontend_max_capacity        = 10
  api_cpu                      = 2048  # 2 vCPU
  api_memory                  = 4096  # 4 GB
  api_min_capacity            = 2
  api_max_capacity            = 8
  health_check_grace_period   = 60
}

# RDS configuration
rds_settings = {
  instance_class               = "db.r5.xlarge"
  allocated_storage           = 100
  engine_version              = "13.7"
  multi_az                    = true
  backup_retention_period     = 30
  replica_count               = 3
  storage_type                = "gp3"
  kms_key_rotation_enabled    = true
  monitoring_interval         = 60
  performance_insights_enabled = true
  deletion_protection         = true
}

# Resource tagging
tags = {
  Environment = "Production"
  Project     = "Startup Metrics Platform"
  ManagedBy   = "Terraform"
}