# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC for resource association and network identification"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block range of the VPC for network planning and security group configuration"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "List of public subnet IDs across availability zones for web tier resources including load balancers"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs across availability zones for application tier resources including ECS tasks"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "List of database subnet IDs across availability zones for RDS and ElastiCache resources with enhanced isolation"
  value       = aws_subnet.database[*].id
}

# NAT Gateway Outputs
output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs for private subnet internet access with high availability configuration"
  value       = aws_nat_gateway.main[*].id
}

# Route Table Outputs
output "public_route_table_id" {
  description = "ID of the public route table for internet-facing resources"
  value       = aws_route_table.public.id
}

output "private_route_table_ids" {
  description = "List of private route table IDs for application tier routing configuration"
  value       = aws_route_table.private[*].id
}

output "database_route_table_ids" {
  description = "List of database route table IDs for data tier routing configuration"
  value       = aws_route_table.database[*].id
}

# Flow Log Outputs
output "vpc_flow_log_id" {
  description = "ID of the VPC Flow Log for network traffic monitoring"
  value       = aws_flow_log.main.id
}

output "flow_log_group_name" {
  description = "Name of the CloudWatch Log Group containing VPC Flow Logs"
  value       = aws_cloudwatch_log_group.flow_log.name
}

# Availability Zone Outputs
output "availability_zones" {
  description = "List of availability zones where VPC resources are deployed"
  value       = var.availability_zones
}