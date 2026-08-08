import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function findEnvVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  if (process.env[`NEXT_PUBLIC_${name}`]) return process.env[`NEXT_PUBLIC_${name}`];
  
  const lowerName = name.toLowerCase();
  const matchKey = Object.keys(process.env).find(k => {
    const lk = k.toLowerCase();
    return lk === lowerName || lk === `next_public_${lowerName}`;
  });
  return matchKey ? process.env[matchKey] : undefined;
}

export async function GET() {
  const turnServerUrl = findEnvVar('TURN_SERVER_URL');
  const turnUsername = findEnvVar('TURN_SERVER_USERNAME');
  const turnPassword = findEnvVar('TURN_SERVER_PASSWORD');

  const turnKeysFound = Object.keys(process.env).filter(k => k.toLowerCase().includes('turn'));

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ];

  if (turnServerUrl && turnUsername && turnPassword) {
    const cleanUrl = turnServerUrl.replace(/^(turn|turns):/i, '').split('?')[0];
    console.log('[WebRTC API Config] Using custom TURN server:', cleanUrl);
    iceServers.push({
      urls: [
        `turn:${cleanUrl}`,
        `turn:${cleanUrl}?transport=udp`,
        `turn:${cleanUrl}?transport=tcp`,
        `turns:${cleanUrl}?transport=tcp`
      ],
      username: turnUsername,
      credential: turnPassword,
    });
  } else {
    console.log('[WebRTC API Config] No custom TURN credentials found. Using Metered Open Relay TURN fallback.');
    iceServers.push(
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:80?transport=udp',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
          'turns:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    );
  }

  return NextResponse.json({ 
    iceServers,
    debug: {
      usedCustomTurn: !!(turnServerUrl && turnUsername && turnPassword),
      urlPrefix: turnServerUrl ? turnServerUrl.substring(0, 15) : 'metered-openrelay',
      envKeysFound: turnKeysFound,
    }
  });
}
