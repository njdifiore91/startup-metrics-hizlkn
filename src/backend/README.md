# Startup Metrics Benchmarking Platform - Backend Service

## Overview

The Startup Metrics Benchmarking Platform backend service is a Node.js-based REST API that provides comprehensive benchmark data and analytics for startup metrics. Built with TypeScript and Express.js, it offers secure, scalable, and performant access to startup benchmarking data.

## Prerequisites

- Node.js 18 LTS or higher
- Docker 20+ and Docker Compose
- PostgreSQL 13+
- Redis 6+
- Google OAuth credentials

## Getting Started

### Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd startup-metrics-backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### Environment Configuration

Required environment variables:
```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/metrics

# Redis Cache
REDIS_URL=redis://localhost:6379

# Authentication
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=1h

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
```

### Development Setup

```bash
# Start development containers
docker-compose up -d

# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Start development server
npm run dev
```

## Development

### Project Structure

```
src/
├── auth/           # Authentication and authorization
├── benchmarks/     # Benchmark data processing
├── config/         # Configuration management
├── controllers/    # Request handlers
├── interfaces/     # TypeScript interfaces
├── middleware/     # Express middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── validators/     # Request validation
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run test` - Run test suite
- `npm run lint` - Run code linting
- `npm run format` - Format code with Prettier
- `npm run docs:generate` - Generate API documentation
- `npm run docker:build` - Build Docker image

## API Documentation

### Authentication

The API uses Google OAuth 2.0 for authentication and JWT for session management.

```typescript
// Authentication Flow
POST /api/auth/google
POST /api/auth/refresh
POST /api/auth/logout
```

### Core Endpoints

```typescript
// Metrics
GET    /api/metrics
GET    /api/metrics/:id
POST   /api/metrics/compare

// Benchmarks
GET    /api/benchmarks
GET    /api/benchmarks/:category
POST   /api/benchmarks/analyze

// Reports
POST   /api/reports/generate
GET    /api/reports/:id
```

### Security Headers

```typescript
// Security middleware configuration
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true
}));
```

## Security

### Authentication Flow

1. Client initiates Google OAuth flow
2. Backend validates Google token
3. JWT session token issued
4. Subsequent requests use JWT Bearer token

### Data Protection

- All sensitive data encrypted at rest
- TLS 1.3 required for all connections
- Rate limiting per IP and user
- Input validation and sanitization
- SQL injection protection
- XSS prevention

## Performance

### Caching Strategy

```typescript
// Redis caching configuration
const cacheConfig = {
  store: redisStore,
  ttl: 900, // 15 minutes
  max: 100,
  isCacheableValue: (val: any) => val !== undefined
};
```

### Database Optimization

- Connection pooling
- Query optimization
- Indexed fields
- Materialized views for reports

## Deployment

### Docker Deployment

```bash
# Build production image
docker build -t startup-metrics-backend .

# Run container
docker run -p 3000:3000 \
  --env-file .env \
  --network startup-metrics-network \
  startup-metrics-backend
```

### Health Monitoring

```typescript
// Health check endpoint
GET /api/health
{
  status: "healthy",
  version: "1.0.0",
  timestamp: "2023-06-14T10:00:00Z",
  services: {
    database: "connected",
    redis: "connected"
  }
}
```

### Backup Procedures

```bash
# Database backup
npm run db:backup

# Verify backup
npm run db:verify-backup

# Restore from backup
npm run db:restore
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details