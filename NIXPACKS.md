# Nixpacks Deployment Guide

This project uses Nixpacks (Coolify's default build system) for deployment.

## Configuration

The `nixpacks.toml` file configures:
- **Node.js 20** - Runtime environment
- **FFmpeg** - Required for video processing
- **Build command** - `npm run build`
- **Start command** - `npm start` (runs custom server.ts)

## How It Works

1. Coolify detects the `nixpacks.toml` file
2. Installs Node.js 20 and FFmpeg via Nix packages
3. Runs `npm ci` to install dependencies
4. Runs `npm run build` to build the Next.js app
5. Starts the app with `npm start` (which runs `tsx server.ts`)

## Environment Variables

Set these in Coolify:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV=production` (automatically set by nixpacks.toml)
- `STORAGE_TYPE=local`
- `STORAGE_LOCAL_DIR=/app/storage` (mount a volume for persistence)

## Volume Mounts

Mount a volume for persistent storage:
- **Container path:** `/app/storage`
- **Host path:** Your choice (e.g., `/data/riverside-clone/storage`)

## Advantages of Nixpacks

- ✅ Simpler configuration (no Dockerfile needed)
- ✅ Automatic dependency detection
- ✅ Built-in support for Node.js and FFmpeg
- ✅ Coolify's native build system
- ✅ Easier to maintain

## Troubleshooting

If you need to switch back to Dockerfile:
1. Rename `Dockerfile.backup` to `Dockerfile`
2. Remove or rename `nixpacks.toml`
3. Coolify will use the Dockerfile instead
