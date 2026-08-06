# PodNow - Video Podcast Recording App

A beginner-friendly video podcast recording application built with Next.js, WebRTC, and FFmpeg.

## Features

- **User Authentication**: Sign up and login with email/password
- **Session Management**: Create recording sessions and share guest links
- **WebRTC Video Calls**: Real-time peer-to-peer video communication
- **Local Recording**: Browser-based recording with separate tracks per participant
- **Chunked Uploads**: Resumable file uploads with progress tracking
- **Server-Side Processing**: FFmpeg-based video/audio merging and trimming
- **Episode Management**: View, edit, and download completed episodes
- **Episode Search & Filter**: Search by title/ID and filter by state
- **User Settings**: Update email and password
- **Episode Descriptions**: Add notes and descriptions to episodes
- **Processing Progress**: Real-time progress tracking with percentage

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL
- **Real-time**: Socket.io (WebSocket)
- **Storage**: Local filesystem (S3-compatible abstraction layer)
- **Processing**: FFmpeg (fluent-ffmpeg)
- **Testing**: Jest, React Testing Library

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- **FFmpeg installed on the system** (see installation instructions below)
- TURN server (for WebRTC NAT traversal, optional for development)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   
   Create a `.env` file in the root directory with the following variables:
   
   **Required:**
   - `DATABASE_URL` - Your PostgreSQL connection string (you already have this)
   - `JWT_SECRET` - A random secret key for authentication (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `STORAGE_TYPE=local` - Use local filesystem storage
   - `STORAGE_LOCAL_DIR=./uploads` - Directory for uploaded files
   
   **Optional:**
   - `FFMPEG_PATH` - Full path to FFmpeg executable (only if not in system PATH)
   - `TURN_SERVER_URL` - TURN server URL (leave empty for development)
   - `TURN_SERVER_USERNAME` - TURN server username
   - `TURN_SERVER_PASSWORD` - TURN server password
   
   See `ENV_SETUP.md` for detailed explanations and setup instructions.
   
   Example `.env`:
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/riverside_clone
   JWT_SECRET=your-generated-secret-key-here
   STORAGE_TYPE=local
   STORAGE_LOCAL_DIR=./uploads
   # TURN server variables (optional)
   # TURN_SERVER_URL=
   # TURN_SERVER_USERNAME=
   # TURN_SERVER_PASSWORD=
   ```

3. **Install FFmpeg**:
   
   **Windows:**
   - Download FFmpeg from https://www.gyan.dev/ffmpeg/builds/
   - Extract to a folder (e.g., `C:\ffmpeg`)
   - Add `C:\ffmpeg\bin` to your system PATH, OR
   - Set `FFMPEG_PATH` in your `.env` file: `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe`
   
   **macOS:**
   ```bash
   brew install ffmpeg
   ```
   
   **Linux (Ubuntu/Debian):**
   ```bash
   sudo apt update
   sudo apt install ffmpeg
   ```
   
   **Verify installation:**
   ```bash
   ffmpeg -version
   ```
   
   If FFmpeg is not in your PATH, add `FFMPEG_PATH` to your `.env` file with the full path to the executable.

4. **Set up the database**:
   Run the SQL schema file:
   ```bash
   psql -d podnow -f lib/db/schema.sql
   ```
   
   Run migration scripts for new features:
   ```bash
   psql -d podnow -f scripts/add-episode-description-column.sql
   psql -d podnow -f scripts/add-processing-progress-column.sql
   ```
   
   Or use your database tool (pgAdmin, etc.) to run the SQL from `lib/db/schema.sql`.

5. **Start the development server**:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Testing

Run tests with:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   └── join/              # Guest join page
├── lib/                   # Shared utilities
│   ├── auth/              # Authentication logic
│   ├── db/                # Database queries
│   ├── storage/           # Storage abstraction
│   ├── webrtc/           # WebRTC utilities
│   ├── recording/        # Recording logic
│   ├── upload/            # Upload utilities
│   └── processing/       # FFmpeg processing
├── components/            # React components
├── __tests__/            # Test files
└── memory-bank/          # Project documentation
```

## Usage

1. **Sign up** for an account
2. **Create a session** and share the guest link
3. **Start recording** when both participants are ready
4. **Uploads** happen automatically after recording stops
5. **Process and export** episodes with optional trimming

## Development

- Run `npm run dev` for development
- Run `npm run build` to build for production
- Run `npm start` to start production server
- Run `npm test` to run tests

## Notes

- Raw uploaded media is never auto-deleted until export succeeds
- All job state is persisted in PostgreSQL
- Storage uses logical file references (not absolute paths)
- WebSocket is used for real-time UI updates with HTTP polling fallback
