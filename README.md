# MCP Server for Claude

A comprehensive Model Context Protocol (MCP) server for Claude AI integration with user authentication, rate limiting, and Docker support.

## Features

- 🔐 **User Authentication**: JWT-based authentication with API key support
- 🚦 **Rate Limiting**: Per-user rate limiting with configurable limits
- 🛠️ **MCP Tools**: File operations, web search, database queries, and more
- 🐳 **Docker Support**: Complete Docker setup with MySQL and Redis
- 📊 **Audit Logging**: Comprehensive logging and monitoring
- 🔌 **STDIO Support**: Claude Desktop integration via STDIO
- 🌐 **REST API**: HTTP API for web and mobile applications

## Architecture

The server consists of:

- **MCP Server Container**: Node.js 22 with TypeScript and Express.js
- **MySQL Database**: User management, audit logs, and tool configurations
- **Redis Cache**: Session storage and rate limiting
- **Optional Services**: Adminer (DB management), Redis Commander

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 22+ (for local development)
- Claude API key

### 1. Clone and Setup

```bash
git clone <repository-url>
cd mcp-server-claude
```

### 2. Environment Configuration

Copy the environment file and configure:

```bash
cp .env.development .env.local
```

Edit `.env.local` with your configuration:

```env
# Claude API Configuration
CLAUDE_API_KEY=your_claude_api_key_here

# Database Configuration
DB_PASSWORD=your_secure_password

# Authentication
JWT_SECRET=your_jwt_secret_here
API_KEY=your_api_key_here
```

### 3. Start with Docker

```bash
# Development environment
docker-compose up -d

# Production environment
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Verify Installation

```bash
# Check health
curl http://localhost:3000/api/health

# Check tools
curl http://localhost:3000/api/tools
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires JWT)
- `PUT /api/auth/profile` - Update user profile (requires JWT)
- `POST /api/auth/api-key/regenerate` - Generate new API key (requires JWT)
- `PUT /api/auth/rate-limit` - Update rate limit (requires JWT)
- `GET /api/auth/usage` - Get usage statistics (requires JWT)

### Tools

- `GET /api/tools` - List available tools
- `POST /api/tools/execute/:toolName` - Execute tool (requires API key)

### Health

- `GET /api/health` - Health check

## Authentication Methods

### 1. JWT Token Authentication

Include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer <jwt_token>" http://localhost:3000/api/auth/profile
```

### 2. API Key Authentication

Include the API key in the X-API-Key header:

```bash
curl -H "X-API-Key: mcp_<api_key>" http://localhost:3000/api/tools
```

## User Management

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

### Execute Tools

```bash
curl -X POST http://localhost:3000/api/tools/execute/file_operations \
  -H "X-API-Key: mcp_<api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "list",
    "path": "/workspace"
  }'
```

## Rate Limiting

Each user has a configurable rate limit (default: 100 requests per hour). The rate limit is tracked per user and resets every hour.

### Update Rate Limit

```bash
curl -X PUT http://localhost:3000/api/auth/rate-limit \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rateLimitPerHour": 500
  }'
```

## Claude Desktop Integration

The server supports Claude Desktop integration via STDIO. To use with Claude Desktop:

1. Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-server-claude": {
      "command": "node",
      "args": ["/path/to/dist/server.js"],
      "env": {
        "MCP_MODE": "stdio"
      }
    }
  }
}
```

2. Restart Claude Desktop

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Database Management

Access Adminer at http://localhost:8080:
- Server: `mysql`
- Username: `root`
- Password: `root`
- Database: `mcp_claude`

Access Redis Commander at http://localhost:8081

### Logs

View application logs:

```bash
# Docker logs
docker-compose logs -f mcp-server-claude

# Local logs
tail -f logs/app.log
```

## Production Deployment

### 1. Environment Setup

```bash
cp .env.production .env.local
# Edit .env.local with production values
```

### 2. Start Production Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Optional: Add Nginx

```bash
# Start with Nginx
docker-compose -f docker-compose.prod.yml --profile nginx up -d
```

## Security Considerations

- Change all default passwords and secrets
- Use strong JWT secrets
- Configure proper CORS origins
- Set up SSL/TLS in production
- Regularly update dependencies
- Monitor audit logs

## Monitoring

The server includes comprehensive logging:

- **Application Logs**: Request/response logging
- **Audit Logs**: User actions and API usage
- **Error Logs**: Detailed error information
- **Health Checks**: Service availability monitoring

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MySQL container is running
   - Verify database credentials
   - Check network connectivity

2. **Redis Connection Failed**
   - Check Redis container is running
   - Verify Redis configuration

3. **Authentication Issues**
   - Verify JWT secret configuration
   - Check API key format
   - Ensure proper headers

4. **Rate Limiting Issues**
   - Check Redis connectivity
   - Verify rate limit configuration
   - Clear Redis cache if needed

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.