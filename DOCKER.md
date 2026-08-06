# Docker Deployment Guide

This guide explains how to build and deploy the Riverside Clone application using Docker.

## Prerequisites

- Docker installed on your system
- PostgreSQL database accessible from the container
- FFmpeg installed in the container (handled by Dockerfile)

## Building the Docker Image

```bash
docker build -t riverside-clone:latest .
```

## Running the Container

### Basic Run

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e JWT_SECRET="your-secret-key" \
  -e NODE_ENV="production" \
  riverside-clone:latest
```

### Complete Environment Variables

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e JWT_SECRET="your-secret-key-here" \
  -e NODE_ENV="production" \
  -e PORT="3000" \
  -e HOSTNAME="0.0.0.0" \
  riverside-clone:latest
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | - |
| `JWT_SECRET` | Yes | Secret key for JWT token signing | - |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | No | Port to listen on | `3000` |
| `HOSTNAME` | No | Hostname to bind to | `0.0.0.0` |

## Docker Compose Example

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/riverside
      - JWT_SECRET=your-secret-key-here
      - NODE_ENV=production
    depends_on:
      - db
    volumes:
      - ./storage:/app/storage  # Optional: persist file storage

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=riverside
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
```

## Coolify Deployment

For Coolify deployment, you have two options:

### Option 1: Use Nixpacks (Recommended)
Coolify will automatically detect and use Nixpacks with the `nixpacks.toml` configuration file. This is the simplest approach:
- FFmpeg is automatically installed via Nixpacks
- Build and start commands are configured in `nixpacks.toml`
- No Dockerfile needed

### Option 2: Use Dockerfile
If you prefer Docker:
1. **Build Command:** `npm ci && npm run build`
2. **Start Command:** `npm start`
3. Coolify will automatically detect and use the Dockerfile

### Required Environment Variables in Coolify:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - A secure random string for JWT signing
- `NODE_ENV=production`

### Important Notes:
- FFmpeg is automatically installed in the Docker image
- The container runs as a non-root user for security
- Port 3000 is exposed by default
- Make sure your PostgreSQL database is accessible from the container

## Troubleshooting

### FFmpeg Not Found
If you encounter FFmpeg errors, ensure the Dockerfile properly installs FFmpeg (it should be automatic).

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is accessible from the container network
- Check firewall rules if using external database

### Port Already in Use
Change the port mapping: `-p 8080:3000` (host:container)

### Build Failures
- Ensure all dependencies are in `package.json`
- Check Node.js version compatibility (requires Node 20+)
- Verify all source files are present

## Production Considerations

1. **File Storage**: Consider mounting a volume for persistent storage:
   ```bash
   -v /path/to/storage:/app/storage
   ```

2. **Database**: Use a managed PostgreSQL service or ensure proper backups

3. **SSL/TLS**: Use a reverse proxy (nginx, Traefik) for HTTPS

4. **Monitoring**: Add health check endpoints and monitoring tools

5. **Logging**: Configure proper logging for production debugging
