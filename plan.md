


PodNow - Implementation Plan
Architecture Overview
The application will be built as a Next.js full-stack application with:

Frontend: Next.js App Router with React components
Backend: Next.js API routes
Database: PostgreSQL for users, sessions, episodes, processing jobs
Real-time: WebSockets (Socket.io) for live UI updates (with polling fallback)
Storage: Storage abstraction layer (local filesystem for v1, S3-compatible ready)
Processing: FFmpeg for video/audio merging and trimming
WebRTC: Peer-to-peer video calls with self-hosted TURN server
Product Scope & Constraints (V1)
This is NOT a full Riverside.fm clone. V1 focuses on:

Linear workflow: create → record → upload → edit → export
Opinionated defaults with minimal configuration
Beginner-first UX with clear, jargon-free messaging
Host + single guest sessions only
Basic trimming (start/end) and merging
Simple episode management
Explicitly OUT of scope for V1:

Multi-guest rooms (3+ participants)
Live streaming or broadcasting
Advanced editing (transitions, effects, multiple cuts)
Analytics or usage metrics
AI features (transcription, auto-editing, etc.)
Social sharing or publishing integrations
Ownership Model:

All sessions, uploads, and episodes are owned by the host account
Guests never own or manage episode data
Guests join via token-based links without accounts
Project Structure
riverside-clone/
├── memory-bank/           # Project documentation
├── app/                   # Next.js App Router
│   ├── (auth)/           # Auth routes (login, signup)
│   ├── (dashboard)/      # Protected routes
│   │   ├── sessions/     # Session management
│   │   ├── episodes/     # Episode list and management
│   │   └── record/       # Recording interface
│   ├── join/             # Guest join page (public)
│   ├── api/              # API routes
│   │   ├── auth/        # Authentication endpoints
│   │   ├── sessions/    # Session CRUD
│   │   ├── upload/      # File upload endpoints
│   │   ├── episodes/    # Episode management
│   │   └── processing/  # Processing status
│   └── websocket/        # WebSocket handler
├── lib/                  # Shared utilities
│   ├── db/              # Database client and queries
│   ├── storage/         # Storage abstraction (StorageProvider interface)
│   ├── webrtc/          # WebRTC utilities
│   ├── recording/       # Recording logic
│   ├── upload/          # Upload utilities
│   └── processing/      # FFmpeg processing
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── recording/       # Recording interface
│   └── episodes/        # Episode management UI
├── public/              # Static assets
└── uploads/             # Local file storage (gitignored)
Implementation Phases
Phase 1: Project Setup & Foundation
Initialize Next.js project with TypeScript
Set up PostgreSQL database connection
Create Memory Bank documentation structure
Set up project dependencies (Socket.io, WebRTC libraries, FFmpeg bindings)
Configure environment variables
Create storage abstraction layer (StorageProvider interface)
Implement local filesystem provider for v1
Design interface to support S3-compatible storage swap later
Phase 2: Database Schema
Create PostgreSQL tables:

users - User accounts (id, email, password_hash, created_at)
sessions - Recording sessions (id, host_id, guest_token, state, recording_started_at, created_at, updated_at)
recording_started_at: Timestamp when recording began (for track synchronization)
episodes - Completed episodes (id, session_id, host_id, title, state, file_references, created_at)
file_references: Logical storage paths (not absolute paths)
uploads - Upload tracking (id, session_id, participant_type, file_reference, status, progress)
file_reference: Logical storage path (not absolute path)
processing_jobs - Processing job state (id, episode_id, status, error_message, created_at, updated_at)
Status: pending, processing, completed, failed
All job state persisted in database (queue is executor only)
Phase 3: Authentication System
Build signup/login pages with form validation
Implement password hashing (bcrypt)
Create JWT-based session management
Add protected route middleware
Build user context/provider for frontend
Phase 4: Session Management
Create session API endpoints (create, get, update state)
Implement session state machine (idle → recording → uploading → processing → ready/failed)
Track recording_started_at timestamp when recording begins
Build session creation UI for hosts
Create guest join page (public, token-based)
Add session state display components
Ownership: All sessions owned by host_id; guests have no ownership
Add optional max session duration constraint (v1 guardrail)
Phase 5: WebRTC & Signaling
Set up Socket.io server for WebRTC signaling
Implement offer/answer/ICE candidate exchange
Configure STUN/TURN server connection
Build peer connection management
Create video/audio stream components
Handle connection state (connecting, connected, disconnected)
WebSocket Usage Scope:

WebSockets (Socket.io) used for: live UI updates, upload progress, processing status
Core state transitions are server-driven and persisted in database
UI can fall back to HTTP polling if socket disconnects
State changes always originate from server; WebSocket is for real-time UI sync only
Phase 6: Local Recording
Implement MediaRecorder API for browser-based recording
Create separate recording tracks per participant
Add recording state management (start/stop)
Build recording indicators and controls (host-only)
Handle recording errors and browser compatibility
Phase 7: Chunked Upload System
Implement chunked file upload on frontend
Create upload API with resumable support using storage abstraction
Store logical file references (not absolute paths) in database
Add upload progress tracking (via WebSocket with polling fallback)
Build upload status UI for host
Handle upload failures and retries
Add optional soft file size limits per recording (v1 guardrail)
Phase 8: Server-Side Processing
Set up FFmpeg processing pipeline
Implement video/audio synchronization (use recording_started_at for alignment)
Build trimming functionality (start/end trim points)
Create merge logic for host + guest tracks
Export final MP4 and MP3 files
Implement job queue system:
All job state persisted in PostgreSQL (processing_jobs table)
In-memory queue acts as executor only
Jobs can be safely retried after server restart
Status: pending, processing, completed, failed
Add processing status updates via WebSocket (with polling fallback)
Processing Safety Rule: Never auto-delete raw uploaded media
Raw files persist until final export succeeds
Enables retries and recovery
Reduces catastrophic failure scenarios
Phase 9: Episode Management
Build episodes list page
Create episode detail view with editing UI
Implement trim point selection interface
Add download endpoints for MP4/MP3
Build delete functionality
Add episode metadata display
Phase 10: Error Handling & Polish
Implement disconnect handling during recording
Add upload retry/resume UI
Create error messages and warnings
Build processing failure recovery
Add loading states and transitions
Implement mobile responsiveness
Add browser compatibility checks
Key Technical Decisions
WebRTC Signaling: Socket.io for real-time signaling between peers
Recording: Browser MediaRecorder API (separate tracks per participant)
Upload: Chunked uploads with resumable support using multipart uploads
Processing: FFmpeg with Node.js bindings (fluent-ffmpeg)
Job Queue: PostgreSQL-persisted job state; in-memory queue is executor only
All job state in processing_jobs table
Jobs survive server restarts and can be retried
File Storage: Storage abstraction layer (StorageProvider interface)
Local filesystem provider for v1
Logical file references stored in database (not absolute paths)
Designed for easy S3-compatible storage swap later
WebSocket Usage: Real-time UI updates only; core state is server-driven and persisted
Fallback to HTTP polling if socket disconnects
Data Ownership: All sessions, uploads, and episodes owned by host account
Processing Safety: Raw uploaded media never auto-deleted until export succeeds
Dependencies
Next.js 14+ (App Router)
PostgreSQL (pg)
Socket.io (server + client)
bcrypt (password hashing)
jsonwebtoken (JWT)
fluent-ffmpeg (video processing)
zod (validation)
Tailwind CSS (styling)
Environment Variables
DATABASE_URL=postgresql://...
JWT_SECRET=...
TURN_SERVER_URL=...
TURN_SERVER_USERNAME=...
TURN_SERVER_PASSWORD=...
STORAGE_TYPE=local  # 'local' for v1, 's3' for future
STORAGE_LOCAL_DIR=./uploads  # Only used if STORAGE_TYPE=local
# Future S3 vars (not used in v1):
# STORAGE_S3_BUCKET=...
# STORAGE_S3_REGION=...
# STORAGE_S3_ACCESS_KEY=...
# STORAGE_S3_SECRET_KEY=...
Next Steps
Initialize Next.js project
Set up database schema
Create Memory Bank files
Begin with authentication system
Iterate through phases sequentially