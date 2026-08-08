import { NextResponse } from 'next/server';

export async function GET() {
  const turnServerUrl = process.env.TURN_SERVER_URL || process.env.NEXT_PUBLIC_TURN_SERVER_URL;
  const turnUsername = process.env.TURN_SERVER_USERNAME || process.env.NEXT_PUBLIC_TURN_SERVER_USERNAME;
  const turnPassword = process.env.TURN_SERVER_PASSWORD || process.env.NEXT_PUBLIC_TURN_SERVER_PASSWORD;

  console.log('[WebRTC API Config] TURN Env Check:', {
    hasUrl: !!turnServerUrl,
    hasUsername: !!turnUsername,
    hasPassword: !!turnPassword,
    urlValue: turnServerUrl ? turnServerUrl.substring(0, 15) + '...' : undefined,
  });

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ];

  if (turnServerUrl && turnUsername && turnPassword) {
    iceServers.push({
      urls: turnServerUrl,
      username: turnUsername,
      credential: turnPassword,
    });
  }

  return NextResponse.json({ iceServers });
}
