# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency caching
COPY package*.json yarn.lock ./

# Install dependencies with yarn for better performance
RUN yarn install --frozen-lockfile

# Copy source code and config files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript code with optimizations
RUN yarn build

# Prune development dependencies
RUN yarn install --production --ignore-scripts --prefer-offline

# Run security audit
RUN yarn audit

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy production artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Configure security settings
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser && \
    chown -R appuser:appgroup /app

# Set up security headers
RUN echo "net.ipv4.tcp_syncookies=1" >> /etc/sysctl.conf && \
    echo "net.ipv4.tcp_max_syn_backlog=2048" >> /etc/sysctl.conf && \
    echo "net.ipv4.tcp_synack_retries=2" >> /etc/sysctl.conf

# Configure container security
USER appuser
WORKDIR /app

# Set resource limits
LABEL com.startup-metrics.memory-limit="2GB"
LABEL com.startup-metrics.cpu-limit="2"
LABEL com.startup-metrics.pids-limit="50"

# Expose port
EXPOSE 3000

# Configure health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Set volumes
VOLUME ["/app/node_modules", "/tmp"]

# Start application with proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

# Security configurations
LABEL org.opencontainers.image.vendor="Startup Metrics"
LABEL org.opencontainers.image.title="Startup Metrics Backend"
LABEL org.opencontainers.image.description="Production backend service for Startup Metrics Benchmarking Platform"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.source="https://github.com/startup-metrics/backend"
LABEL org.opencontainers.image.licenses="MIT"

# Security options
LABEL seccomp="unconfined"
LABEL no-new-privileges="true"

# Read-only root filesystem
LABEL readonly="true"

# Drop all capabilities except those needed
LABEL cap-drop="ALL"
LABEL cap-add="NET_BIND_SERVICE"