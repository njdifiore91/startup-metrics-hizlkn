# ECS Cluster Outputs
output "cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

# Task Definition Outputs
output "frontend_task_definition_arn" {
  description = "The ARN of the frontend task definition"
  value       = aws_ecs_task_definition.frontend.arn
}

output "api_task_definition_arn" {
  description = "The ARN of the API task definition"
  value       = aws_ecs_task_definition.api.arn
}

# Service Outputs
output "frontend_service_id" {
  description = "The ID of the frontend ECS service"
  value       = aws_ecs_service.frontend.id
}

output "api_service_id" {
  description = "The ID of the API ECS service"
  value       = aws_ecs_service.api.id
}