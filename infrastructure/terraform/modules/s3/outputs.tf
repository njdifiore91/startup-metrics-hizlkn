# Reports bucket outputs
output "reports_bucket_id" {
  description = "ID of the S3 bucket for storing report exports"
  value       = aws_s3_bucket.reports.id
}

output "reports_bucket_arn" {
  description = "ARN of the S3 bucket for storing report exports"
  value       = aws_s3_bucket.reports.arn
}

# Backups bucket outputs
output "backups_bucket_id" {
  description = "ID of the S3 bucket for storing system backups"
  value       = aws_s3_bucket.backups.id
}

output "backups_bucket_arn" {
  description = "ARN of the S3 bucket for storing system backups"
  value       = aws_s3_bucket.backups.arn
}

# Static assets bucket outputs
output "static_assets_bucket_id" {
  description = "ID of the S3 bucket for storing static assets"
  value       = aws_s3_bucket.static_assets.id
}

output "static_assets_bucket_arn" {
  description = "ARN of the S3 bucket for storing static assets"
  value       = aws_s3_bucket.static_assets.arn
}

# KMS key outputs
output "kms_key_arn" {
  description = "ARN of the KMS key used for S3 bucket encryption"
  value       = aws_kms_key.s3.arn
}

output "kms_key_id" {
  description = "ID of the KMS key used for S3 bucket encryption"
  value       = aws_kms_key.s3.key_id
}