# CloudFront distribution outputs exposing essential attributes for cross-module integration
# AWS Provider version: ~> 4.0

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution for DNS and routing configuration"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution for IAM policies and cross-account access"
  value       = aws_cloudfront_distribution.main.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution for DNS configuration"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Route 53 hosted zone ID for the distribution's alias records"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}