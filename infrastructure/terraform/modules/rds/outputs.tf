# Primary RDS instance outputs
output "primary_endpoint" {
  description = "Primary RDS instance endpoint for application connectivity"
  value       = aws_db_instance.main.endpoint
  sensitive   = false
}

output "primary_address" {
  description = "Primary RDS instance address for DNS resolution"
  value       = aws_db_instance.main.address
  sensitive   = false
}

output "primary_port" {
  description = "Database port number for connection configuration"
  value       = aws_db_instance.main.port
  sensitive   = false
}

output "primary_identifier" {
  description = "Primary RDS instance identifier for resource referencing"
  value       = aws_db_instance.main.identifier
  sensitive   = false
}

output "primary_availability_zone" {
  description = "Availability zone of primary RDS instance"
  value       = aws_db_instance.main.availability_zone
  sensitive   = false
}

# Read replica outputs
output "replica_endpoints" {
  description = "List of read replica endpoints for high availability configuration"
  value       = aws_db_instance.replica[*].endpoint
  sensitive   = false
}

output "replica_identifiers" {
  description = "List of read replica identifiers for resource referencing"
  value       = aws_db_instance.replica[*].identifier
  sensitive   = false
}

output "replica_availability_zones" {
  description = "List of availability zones for read replicas"
  value       = aws_db_instance.replica[*].availability_zone
  sensitive   = false
}

# Connection string outputs
output "connection_string" {
  description = "Formatted PostgreSQL connection string for application configuration"
  value       = "postgresql://${aws_db_instance.main.username}:${random_password.master_password.result}@${aws_db_instance.main.endpoint}/postgres"
  sensitive   = true
}

output "readonly_connection_string" {
  description = "Formatted PostgreSQL connection string for read-only replica connections"
  value       = length(aws_db_instance.replica) > 0 ? "postgresql://${aws_db_instance.main.username}:${random_password.master_password.result}@${aws_db_instance.replica[0].endpoint}/postgres" : null
  sensitive   = true
}