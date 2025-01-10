# Development environment configuration for Startup Metrics Benchmarking Platform
# Version: 1.0
# Last Updated: 2023

# Environment identifier
environment = "dev"

# AWS region configuration
region = "us-east-1"

# Network configuration
vpc_cidr = "10.0.0.0/16"

# Compute resource specifications for development environment
# Using t3.medium instances as specified in Technical Specifications/8.1.2
web_instance_type = "t3.medium"
api_instance_type = "t3.medium"

# Database specifications for development
# Using minimal configurations as per Technical Specifications/8.1.2
db_instance_class = "db.t3.medium"
redis_node_type = "cache.t3.medium"

# Scaling configuration for development environment
# Minimal scaling requirements for development as per Technical Specifications/2.5
web_min_capacity = 1
web_max_capacity = 2
api_min_capacity = 1
api_max_capacity = 2

# High availability configuration
# Single-AZ deployment for development as per Technical Specifications/8.1.2
multi_az = false
availability_zones = ["us-east-1a"]

# Backup retention configuration for development environment
# Minimum required retention periods
db_backup_retention = 7
redis_snapshot_retention = 7