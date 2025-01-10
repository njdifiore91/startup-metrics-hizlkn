# Startup Metrics Benchmarking Platform - Staging Environment Configuration
# Terraform version: ~> 1.0

# Environment identifier
environment = "staging"

# AWS region for resource deployment
region = "us-west-2"

# Network configuration
vpc_cidr = "10.1.0.0/16"

# Compute instance types - optimized for staging workloads
web_instance_type = "t3.medium"  # 2 vCPU, 4GB RAM
api_instance_type = "t3.medium"  # 2 vCPU, 4GB RAM

# Database configuration - balanced performance for testing
db_instance_class = "db.t3.medium"  # 2 vCPU, 4GB RAM

# Cache configuration - sufficient for staging cache requirements
redis_node_type = "cache.t3.medium"  # 2 vCPU, 3.09GB RAM

# Auto-scaling configuration - limited scaling for cost control
web_min_capacity = 1
web_max_capacity = 3
api_min_capacity = 1
api_max_capacity = 3

# Backup retention periods - reduced for staging environment
db_backup_retention = 7     # 7 days retention for database backups
redis_snapshot_retention = 3 # 3 days retention for Redis snapshots

# High availability configuration - disabled for staging to optimize costs
multi_az = false