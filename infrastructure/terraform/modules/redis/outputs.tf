# Primary endpoint for Redis cluster write operations
output "redis_primary_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "Primary endpoint address for Redis cluster write operations and primary node connections"
}

# Reader endpoint for Redis cluster read operations
output "redis_reader_endpoint" {
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  description = "Reader endpoint address for Redis cluster read operations and read replica connections"
}

# Port number for Redis cluster connections
output "redis_port" {
  value       = aws_elasticache_replication_group.redis.port
  description = "Port number used for Redis cluster connections (default: 6379)"
}

# Security group ID for Redis cluster network access
output "redis_security_group_id" {
  value       = aws_security_group.redis.id
  description = "Security group ID associated with Redis cluster for network access control"
}