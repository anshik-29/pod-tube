# How to Check if FFmpeg is Installed in Docker Container

## Quick Check Commands

### 1. **Check FFmpeg Version** (Recommended)
```bash
# If using Coolify, get container name from Coolify dashboard
docker exec <container-name> ffmpeg -version
```

### 2. **Check if FFmpeg Binary Exists**
```bash
docker exec <container-name> which ffmpeg
# Should return: /nix/store/.../bin/ffmpeg (for Nixpacks)
# Or: /usr/bin/ffmpeg (for Dockerfile)
```

### 3. **Check FFmpeg Path**
```bash
docker exec <container-name> command -v ffmpeg
```

### 4. **Test FFmpeg Functionality**
```bash
docker exec <container-name> ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 -f null -
# This creates a test video and discards it (quick test)
```

### 5. **Check Nix Packages (if using Nixpacks)**
```bash
docker exec <container-name> nix-env -q | grep ffmpeg
```

## Finding Your Container Name

### In Coolify:
1. Go to your application in Coolify dashboard
2. Look for the container name (usually something like `d0ko0s8w8kwoswc84gg08k4w`)
3. Or use: `docker ps` to list all running containers

### Using Docker Commands:
```bash
# List all running containers
docker ps

# Find container by image name
docker ps --filter "ancestor=<your-image-name>"

# Or find by label (if Coolify adds labels)
docker ps --filter "label=com.coolify.app=<app-name>"
```

## Expected Results

### If FFmpeg is Installed (Nixpacks):
```
$ docker exec <container> ffmpeg -version
ffmpeg version 6.x.x
...
```

### If FFmpeg is NOT Installed:
```
$ docker exec <container> ffmpeg -version
/bin/sh: ffmpeg: not found
```

## Troubleshooting

### If FFmpeg is Missing:

1. **Check nixpacks.toml** - Ensure it includes:
   ```toml
   [phases.setup]
   nixPkgs = ["nodejs_20", "ffmpeg"]
   ```

2. **Rebuild the container** - FFmpeg should be installed during the build phase

3. **Check build logs** - Look for FFmpeg installation in the Nixpacks build output

4. **Manual Installation** (temporary test):
   ```bash
   docker exec -it <container> sh
   # Then inside container:
   nix-env -iA nixpkgs.ffmpeg
   ```

### Verify Installation Path:

The code checks for FFmpeg in this order:
1. `process.env.FFMPEG_PATH` (if set)
2. `process.env.FFMPEG_BIN_PATH` (if set)
3. System PATH (default)

Check what path is being used:
```bash
docker exec <container> node -e "console.log(require('fluent-ffmpeg').getAvailableEncoders())"
```

## Quick Test Script

Create a test endpoint to check FFmpeg from your app:

```typescript
// app/api/health/ffmpeg/route.ts
import { NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Check if ffmpeg binary exists
    const { stdout: whichFfmpeg } = await execAsync('which ffmpeg');
    
    // Get ffmpeg version
    const { stdout: version } = await execAsync('ffmpeg -version');
    
    return NextResponse.json({
      installed: true,
      path: whichFfmpeg.trim(),
      version: version.split('\n')[0],
    });
  } catch (error) {
    return NextResponse.json({
      installed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

Then visit: `https://your-domain.com/api/health/ffmpeg`
