# Contributing to Startup Metrics Benchmarking Platform

## Introduction

### Project Purpose
The Startup Metrics Benchmarking Platform is a web-based solution designed to provide founders and executives with comprehensive benchmark data across key startup metrics. We welcome contributions that help improve the platform's functionality, security, and user experience.

### Contribution Value
Your contributions help build a more robust and valuable tool for the startup ecosystem. Whether it's fixing bugs, adding features, improving documentation, or suggesting enhancements, all contributions are valuable.

### Code of Conduct
Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We expect all contributors to adhere to these guidelines to maintain a positive and inclusive community.

### Getting Started
1. Fork the repository
2. Set up your development environment
3. Make your changes
4. Submit a pull request

## Development Setup

### Required Tools and Versions
- Node.js 18 LTS
- PostgreSQL 13+
- Redis 6+
- Docker 20+
- VS Code (recommended)
- Git 2.x+

### Environment Setup Steps
1. Clone your forked repository:
```bash
git clone https://github.com/your-username/startup-metrics-platform.git
cd startup-metrics-platform
```

2. Install dependencies:
```bash
# Backend dependencies
cd src/backend
npm install

# Frontend dependencies
cd ../web
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. Start development services:
```bash
docker-compose up -d # Starts PostgreSQL and Redis
npm run dev         # Starts development servers
```

### Configuration Guidelines
- Use environment variables for configuration
- Never commit sensitive data or credentials
- Follow the provided `.env.example` template
- Use separate configurations for development and testing

## Code Standards

### TypeScript Standards
- Strict mode enabled
- Explicit return types on functions
- Interface-first approach
- Proper error handling with custom types

### ESLint Configuration
- Use project's `.eslintrc` configuration
- Run linting before commits:
```bash
npm run lint
```

### Code Organization
- Feature-based directory structure
- Clear separation of concerns
- Single responsibility principle
- Dependency injection pattern

### Naming Conventions
- PascalCase for classes and interfaces
- camelCase for variables and functions
- UPPER_CASE for constants
- kebab-case for file names

## Development Workflow

### Git Workflow
1. Create feature branch from `develop`
2. Make atomic commits
3. Push changes to your fork
4. Submit pull request to `develop`

### Branch Naming
- feature/feature-name
- bugfix/bug-description
- hotfix/issue-description
- release/version-number

### Commit Messages
```
type(scope): description

[optional body]

[optional footer]
```
Types: feat, fix, docs, style, refactor, test, chore

## Testing Requirements

### Unit Testing
- Jest for testing framework
- 80% minimum coverage requirement
- Run tests:
```bash
npm run test
```

### Integration Testing
- Supertest for API testing
- End-to-end scenarios
- Database integration tests
- Run integration tests:
```bash
npm run test:integration
```

### Security Testing
- OWASP dependency check
- Snyk vulnerability scanning
- SonarQube code analysis
- Run security checks:
```bash
npm run security-check
```

## Security Guidelines

### Code Security
- Input validation
- Output encoding
- Proper error handling
- Secure session management
- Rate limiting implementation

### Dependency Management
- Regular dependency updates
- Security audits:
```bash
npm audit
```
- Lock file maintenance
- Version pinning

## Documentation

### Code Documentation
- JSDoc comments for functions
- Interface documentation
- Complex logic explanation
- Update README.md when needed

### API Documentation
- OpenAPI/Swagger specifications
- Request/response examples
- Error scenarios
- Authentication details

## Pull Request Process

### PR Template Usage
1. Use provided PR template
2. Fill all required sections
3. Link related issues
4. Add necessary labels

### Review Requirements
- Two approving reviews required
- All comments addressed
- CI checks passing
- Security review for sensitive changes

### CI/CD Checks
- Build verification
- Test suite passing
- Code coverage requirements
- Security scan results
- Linting compliance

## Additional Resources

### Contact Information
- Project maintainers: maintainers@startup-metrics.com
- Security issues: security@startup-metrics.com
- General questions: support@startup-metrics.com

### Useful Tools
- [VS Code Extensions](docs/development/vscode-extensions.md)
- [Development Scripts](docs/development/scripts.md)
- [Testing Utilities](docs/testing/utils.md)

### Support Channels
- GitHub Issues
- Development Slack channel
- Technical documentation
- Community forums

## License
By contributing, you agree that your contributions will be licensed under the project's license.