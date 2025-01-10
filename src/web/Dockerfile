# Stage 1: Build stage
FROM node:18-alpine AS builder
# node:18-alpine v18.17.1

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy package files with appropriate permissions
COPY --chown=appuser:appgroup package*.json ./

# Install dependencies with exact versions and clean cache
RUN npm ci --production=false \
    && npm cache clean --force

# Copy source code with appropriate permissions
COPY --chown=appuser:appgroup . .

# Build arguments validation and environment setup
ARG API_URL
ARG GOOGLE_CLIENT_ID
ARG APP_VERSION

# Validate build arguments
RUN if [ -z "$API_URL" ] || [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$APP_VERSION" ]; then \
    echo "Error: Required build arguments missing" && exit 1; \
    fi

# Set build-time environment variables
ENV NODE_ENV=production \
    VITE_API_URL=$API_URL \
    VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    VITE_APP_VERSION=$APP_VERSION

# Build production bundle with optimization flags
RUN npm run build

# Switch to non-root user
USER appuser

# Stage 2: Production stage
FROM nginx:1.25-alpine
# nginx:1.25-alpine v1.25.2

# Create non-root user for nginx
RUN adduser -D -S -H -u 101 -G nginx nginx

# Copy nginx configuration files
COPY infrastructure/docker/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/docker/security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Copy built assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Configure Nginx security settings
RUN chmod -R 644 /usr/share/nginx/html \
    && chmod -R 644 /etc/nginx/conf.d \
    && chmod -R 644 /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid

# Configure security headers
RUN echo "add_header X-Frame-Options 'DENY' always;" >> /etc/nginx/conf.d/security-headers.conf \
    && echo "add_header X-Content-Type-Options 'nosniff' always;" >> /etc/nginx/conf.d/security-headers.conf \
    && echo "add_header X-XSS-Protection '1; mode=block' always;" >> /etc/nginx/conf.d/security-headers.conf \
    && echo "add_header Strict-Transport-Security 'max-age=31536000; includeSubDomains' always;" >> /etc/nginx/conf.d/security-headers.conf \
    && echo "add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://apis.google.com;\" always;" >> /etc/nginx/conf.d/security-headers.conf

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Container metadata
LABEL maintainer="Startup Metrics Team" \
    version="1.0.0" \
    description="Startup Metrics Frontend Application" \
    security.scan-date=${BUILD_DATE} \
    vendor="Startup Metrics" \
    com.startup-metrics.image.title="Frontend Application" \
    com.startup-metrics.image.documentation="https://docs.startup-metrics.com/frontend"

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]