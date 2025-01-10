# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC for the Startup Metrics Benchmarking Platform"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC for network planning and subnet allocation"
  value       = aws_vpc.main.cidr_block
}

# Database Connection Details
output "database_connection" {
  description = "PostgreSQL database connection details for the application tier including multi-AZ configuration"
  sensitive   = true
  value = {
    endpoint  = aws_db_instance.main.endpoint
    port      = aws_db_instance.main.port
    database  = aws_db_instance.main.db_name
    username  = aws_db_instance.main.username
    password  = aws_db_instance.main.password
    engine    = "postgres"
    version   = aws_db_instance.main.engine_version
    multi_az  = aws_db_instance.main.multi_az
    read_endpoint = aws_db_instance.main.reader_endpoint
  }
}

# Redis Connection Details
output "redis_connection" {
  description = "Redis cluster connection details for distributed caching with high availability"
  sensitive   = true
  value = {
    primary_endpoint        = aws_elasticache_replication_group.main.primary_endpoint_address
    reader_endpoint        = aws_elasticache_replication_group.main.reader_endpoint_address
    port                   = aws_elasticache_replication_group.main.port
    auth_token            = aws_elasticache_replication_group.main.auth_token
    node_type             = aws_elasticache_replication_group.main.node_type
    number_cache_clusters = aws_elasticache_replication_group.main.number_cache_clusters
    engine_version        = aws_elasticache_replication_group.main.engine_version
  }
}

# Private Subnet IDs
output "private_subnet_ids" {
  description = "List of private subnet IDs across multiple availability zones for secure application deployment"
  value       = aws_subnet.private[*].id
}

# Additional Infrastructure Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster for container orchestration"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_discovery_namespace" {
  description = "Service discovery namespace for ECS services"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "load_balancer_dns" {
  description = "DNS name of the application load balancer"
  value       = aws_lb.main.dns_name
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name for CDN access"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "s3_assets_bucket" {
  description = "Name of the S3 bucket for static assets and backups"
  value       = aws_s3_bucket.assets.id
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for encryption"
  sensitive   = true
  value       = aws_kms_key.main.arn
}

output "monitoring_dashboard_url" {
  description = "URL of the CloudWatch dashboard for infrastructure monitoring"
  value       = aws_cloudwatch_dashboard.main.dashboard_arn
}

output "backup_vault_name" {
  description = "Name of the AWS Backup vault for automated backups"
  value       = aws_backup_vault.main.name
}

output "waf_web_acl_id" {
  description = "ID of the WAF web ACL protecting the application"
  value       = aws_wafv2_web_acl.main.id
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID for DNS management"
  value       = aws_route53_zone.main.zone_id
}

output "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  value       = aws_acm_certificate.main.arn
}

output "bastion_host" {
  description = "Bastion host details for secure administrative access"
  sensitive   = true
  value = {
    public_ip = aws_instance.bastion.public_ip
    ssh_key   = aws_key_pair.bastion.key_name
  }
}