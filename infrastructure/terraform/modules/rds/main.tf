# AWS Provider version ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# KMS key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption in ${var.environment} environment"
  deletion_window_in_days = 7
  enable_key_rotation     = var.kms_key_rotation_enabled

  tags = {
    Name        = "${var.environment}-rds-kms-key"
    Environment = var.environment
  }
}

# KMS key alias
resource "aws_kms_alias" "rds" {
  name          = "alias/${var.environment}-rds-key"
  target_key_id = aws_kms_key.rds.key_id
}

# DB subnet group
resource "aws_db_subnet_group" "main" {
  name        = "${var.environment}-rds-subnet-group"
  description = "RDS subnet group for ${var.environment} environment"
  subnet_ids  = var.database_subnet_ids

  tags = {
    Name        = "${var.environment}-rds-subnet-group"
    Environment = var.environment
  }
}

# Parameter group for PostgreSQL
resource "aws_db_parameter_group" "main" {
  family = "postgres${split(".", var.engine_version)[0]}"
  name   = "${var.environment}-postgres-params"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  tags = {
    Name        = "${var.environment}-postgres-params"
    Environment = var.environment
  }
}

# Primary RDS instance
resource "aws_db_instance" "main" {
  identifier = "${var.environment}-postgres-primary"

  # Engine configuration
  engine               = "postgres"
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.rds.arn
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  multi_az              = var.multi_az
  port                  = 5432
  publicly_accessible   = false
  
  # Authentication
  username             = "postgres_admin"
  password             = random_password.master_password.result
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  
  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  
  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name
  
  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.environment}-postgres-final-snapshot"

  tags = {
    Name        = "${var.environment}-postgres-primary"
    Environment = var.environment
  }
}

# Read replicas
resource "aws_db_instance" "replica" {
  count = var.replica_count

  identifier = "${var.environment}-postgres-replica-${count.index + 1}"
  
  # Replica configuration
  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = var.instance_class
  
  # Network configuration
  port                = 5432
  publicly_accessible = false
  multi_az           = false
  
  # Storage configuration
  storage_encrypted = true
  kms_key_id       = aws_kms_key.rds.arn
  
  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  
  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name

  tags = {
    Name        = "${var.environment}-postgres-replica-${count.index + 1}"
    Environment = var.environment
  }
}

# Random password generation for master user
resource "random_password" "master_password" {
  length  = 16
  special = true
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

# Attach enhanced monitoring policy to IAM role
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch alarm for high CPU utilization
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = []  # Add SNS topic ARN for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
}

# CloudWatch alarm for low storage
resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name          = "${var.environment}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10000000000"  # 10GB in bytes
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = []  # Add SNS topic ARN for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
}