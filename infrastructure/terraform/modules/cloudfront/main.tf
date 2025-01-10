# AWS Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# CloudFront Origin Access Identity for S3 bucket access
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "OAI for ${var.project_name} static assets"
}

# Security headers policy for enhanced protection
resource "aws_cloudfront_response_headers_policy" "main" {
  name = "${var.project_name}-${var.environment}-security-headers"

  security_headers_config {
    strict_transport_security {
      override                = true
      max_age_seconds        = 31536000  # 1 year
      include_subdomains     = true
      preload               = true
    }

    content_security_policy {
      override                = true
      content_security_policy = "default-src 'self'"
    }

    frame_options {
      override      = true
      frame_option = "DENY"
    }

    content_type_options {
      override = true
    }

    xss_protection {
      override        = true
      mode_block      = true
      protection      = true
    }
  }
}

# Optimized cache policy for static assets
resource "aws_cloudfront_cache_policy" "main" {
  name        = "${var.project_name}-${var.environment}-cache-policy"
  comment     = "Cache policy for static assets with optimized TTLs"
  default_ttl = 3600  # 1 hour
  max_ttl     = 86400 # 24 hours
  min_ttl     = 1

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
      }
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# Data source for S3 static assets bucket
data "aws_s3_bucket" "static_assets" {
  bucket = data.terraform_remote_state.s3.outputs.static_assets_bucket_id
}

# Enhanced monitoring configuration
resource "aws_cloudfront_monitoring_subscription" "main" {
  distribution_id = aws_cloudfront_distribution.main.id
  monitoring_subscription {
    realtime_metrics_subscription_config {
      realtime_metrics_subscription_status = "Enabled"
    }
  }
}

# Main CloudFront distribution with enhanced security and performance
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  http_version       = "http2and3"
  price_class        = var.price_class
  aliases            = [var.domain_name]
  default_root_object = "index.html"

  logging_config {
    bucket          = var.logs_bucket
    prefix          = "cloudfront/"
    include_cookies = false
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  origin {
    domain_name = data.aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = "S3-${var.project_name}-static-assets"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.project_name}-static-assets"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.main.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.main.id
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }

  web_acl_id = var.waf_web_acl_id

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = var.tags
}

# Outputs
output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  description = "The ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}