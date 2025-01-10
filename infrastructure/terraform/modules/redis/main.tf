# AWS ElastiCache Redis Module
# Provider version: ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.0"
}

# Redis subnet group for network isolation
resource "aws_elasticache_subnet_group" "redis" {
  name        = "redis-${var.environment}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Redis subnet group for ${var.environment} environment"

  tags = merge(var.tags, {
    Name = "redis-${var.environment}-subnet-group"
  })
}

# Security group for Redis cluster
resource "aws_security_group" "redis" {
  name_prefix = "redis-${var.environment}-"
  description = "Security group for Redis cluster in ${var.environment}"
  vpc_id      = var.vpc_id

  # Redis port ingress rule
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "Allow Redis traffic from specified security groups"
  }

  # Deny all outbound traffic by default
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "redis-${var.environment}-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Redis parameter group for optimized settings
resource "aws_elasticache_parameter_group" "redis" {
  family      = "redis6.x"
  name        = "redis-${var.environment}-params"
  description = "Redis parameter group for ${var.environment}"

  # Optimize for session storage and caching
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = var.tags
}

# Redis replication group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "redis-${var.environment}"
  replication_group_description = "Redis cluster for ${var.environment}"
  node_type                    = var.redis_node_type
  number_cache_clusters        = var.redis_cluster_size
  port                         = 6379
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids           = [aws_security_group.redis.id]
  automatic_failover_enabled   = var.multi_az_enabled
  multi_az_enabled            = var.multi_az_enabled
  maintenance_window          = "mon:03:00-mon:04:00"
  snapshot_retention_limit    = var.redis_snapshot_retention
  snapshot_window            = "02:00-03:00"
  engine                     = "redis"
  engine_version             = "6.x"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = merge(var.tags, {
    Name = "redis-${var.environment}"
  })
}

# CloudWatch alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  count               = var.cloudwatch_metric_alarms_enabled ? 1 : 0
  alarm_name          = "redis-${var.environment}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = []
  ok_actions         = []

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "memory_usage" {
  count               = var.cloudwatch_metric_alarms_enabled ? 1 : 0
  alarm_name          = "redis-${var.environment}-memory-usage"
  alarm_description   = "Redis cluster memory usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_actions      = []
  ok_actions         = []

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_hits" {
  count               = var.cloudwatch_metric_alarms_enabled ? 1 : 0
  alarm_name          = "redis-${var.environment}-cache-hits"
  alarm_description   = "Redis cluster cache hit ratio"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CacheHitRate"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "50"
  alarm_actions      = []
  ok_actions         = []

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = var.tags
}