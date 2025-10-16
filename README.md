# MCP Server for Claude

## Architecture Overview

Based on the flow diagram analysis, this is a comprehensive MCP (Model Context Protocol) server that runs in Docker containers and provides various tools and services for Claude AI integration.

## System Components

### Core Infrastructure
- **MCP Server Container** - Node.js 22 + TypeScript + Express.js (Port: 3000)
- **MySQL Database** - Data persistence (Port: 5432, Database: mcp_claude)
- **Redis Cache** - In-memory caching and session store (Port: 6379)
- **PgAdmin** - Optional database management GUI (Port: 5050)
- **Docker Network** - Isolated bridge network for container communication

## Required Functions to Develop

### 1. Core Server Functions (`src/server.ts`)
- [ ] Express.js server initialization
- [ ] Database connection setup (MySQL)
- [ ] Redis connection setup
- [ ] Middleware configuration (CORS, logging, authentication)
- [ ] Error handling middleware
- [ ] Health check endpoint
- [ ] Graceful shutdown handling

### 2. MCP STDIO Handler (`src/mcp-stdio.ts`)
- [ ] STDIO protocol implementation
- [ ] Message parsing and validation
- [ ] Tool registration and discovery
- [ ] Response formatting
- [ ] Error handling for MCP protocol

### 3. API Routes (`src/routes/`)
- [ ] `index.ts` - Main router
- [ ] `health.ts` - Health check endpoints
- [ ] `tools.ts` - MCP tool management endpoints
- [ ] `sessions.ts` - Session management endpoints
- [ ] `auth.ts` - Authentication endpoints

### 4. Business Logic Services (`src/services/`)
- [ ] `database.ts` - Database connection and query service
- [ ] `cache.ts` - Redis cache operations
- [ ] `claude.ts` - Claude API integration service
- [ ] `session.ts` - Session management service
- [ ] `auth.ts` - Authentication and authorization service
- [ ] `logger.ts` - Logging service

### 5. MCP Tools (`src/tools/`)
- [ ] `file-operations.ts` - File read/write/list operations
- [ ] `web-search.ts` - Web search functionality
- [ ] `database-query.ts` - Database query tools
- [ ] `code-execution.ts` - Safe code execution environment
- [ ] `api-caller.ts` - External API integration tools
- [ ] `data-processor.ts` - Data transformation tools

### 6. Middleware (`src/middleware/`)
- [ ] `auth.ts` - Authentication middleware
- [ ] `logging.ts` - Request/response logging
- [ ] `rate-limit.ts` - Rate limiting
- [ ] `validation.ts` - Input validation
- [ ] `error-handler.ts` - Error handling
- [ ] `cors.ts` - Cross-origin resource sharing

### 7. Utilities (`src/utils/`)
- [ ] `config.ts` - Configuration management
- [ ] `logger.ts` - Logging utilities
- [ ] `validator.ts` - Data validation utilities
- [ ] `crypto.ts` - Encryption/decryption utilities
- [ ] `file-utils.ts` - File system utilities
- [ ] `date-utils.ts` - Date/time utilities

### 8. Database Schema
- [ ] Users table - User management
- [ ] Sessions table - Session storage
- [ ] Tools table - Available MCP tools
- [ ] Audit_log table - Activity logging
- [ ] Config table - Server configuration

### 9. Docker Configuration
- [ ] `Dockerfile.dev` - Development container
- [ ] `docker-compose.yml` - Multi-container setup
- [ ] `docker/.env` - Environment variables
- [ ] Volume mounting for development
- [ ] Network configuration

### 10. Configuration Files
- [ ] `package.json` - Dependencies and scripts
- [ ] `tsconfig.json` - TypeScript configuration
- [ ] `nodemon.json` - Development auto-restart
- [ ] `claude_desktop_config.json` - Claude desktop integration
- [ ] `.env.local` - Local environment variables

### 11. Development Setup
- [ ] TypeScript compilation setup
- [ ] ESLint configuration
- [ ] Prettier configuration
- [ ] Testing framework (Jest)
- [ ] Development scripts

### 12. External Integrations
- [ ] Claude API client implementation
- [ ] HTTP client for external APIs
- [ ] Web search integration
- [ ] File system operations
- [ ] Database connection pooling

### 13. Security Features
- [ ] API key management
- [ ] JWT token handling
- [ ] Input sanitization
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Secure headers

### 14. Monitoring & Logging
- [ ] Structured logging
- [ ] Performance metrics
- [ ] Error tracking
- [ ] Health checks
- [ ] Audit trails

### 15. Client Support
- [ ] Claude Desktop App (STDIO protocol)
- [ ] Web API (HTTP REST)
- [ ] Mobile app API support
- [ ] Postman/Insomnia testing support

## Development Priority

### Phase 1 - Core Infrastructure
1. Basic Express server with TypeScript
2. Docker containerization
3. Database and Redis connections
4. Basic health check endpoints

### Phase 2 - MCP Protocol
1. STDIO protocol implementation
2. Tool registration system
3. Basic tool implementations
4. Claude desktop integration

### Phase 3 - Advanced Features
1. Authentication and security
2. Advanced tool implementations
3. External API integrations
4. Monitoring and logging

### Phase 4 - Production Ready
1. Error handling and resilience
2. Performance optimization
3. Security hardening
4. Documentation and testing

## Environment Variables Required

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_HOST=mysql
DB_PORT=5432
DB_NAME=mcp_claude
DB_USER=mcp
DB_PASSWORD=your_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Claude API
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_API_URL=https://api.anthropic.com

# Authentication
JWT_SECRET=your_jwt_secret
API_KEY=your_api_key

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Docker Network Architecture

- **Network Name**: `mcp-network` (bridge)
- **Container Communication**: All services communicate through the Docker network
- **External Access**: Only necessary ports exposed to host
- **Volume Management**: Persistent data storage for database and Redis
- **Development Bind Mount**: Local workspace mounted into container

## Next Steps

1. Set up basic project structure
2. Create Docker configuration
3. Implement core server functionality
4. Add MCP protocol support
5. Develop essential tools
6. Test and iterate