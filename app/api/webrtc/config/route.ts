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

// Parse a TURN URL into host and port, stripping any protocol prefix
function parseTurnUrl(rawUrl: string): { host: string; port: string } {
  // Strip turn:/turns: prefix if present
  let cleaned = rawUrl.replace(/^(turns?:\/\/|turns?:)/i, '').split('?')[0];
  
  // Split host and port
  const parts = cleaned.split(':');
  if (parts.length >= 2) {
    return { host: parts[0], port: parts[1] };
  }
  return { host: parts[0], port: '443' };
}

export async function GET() {
  const turnServerUrl = findEnvVar('TURN_SERVER_URL');
  const turnUsername = findEnvVar('TURN_SERVER_USERNAME');
  const turnPassword = findEnvVar('TURN_SERVER_PASSWORD');

  const turnKeysFound = Object.keys(process.env).filter(k => k.toLowerCase().includes('turn') || k.toLowerCase().includes('metered'));

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ];

  let usedSource = 'none';

  if (turnServerUrl && turnUsername && turnPassword) {
    const { host, port } = parseTurnUrl(turnServerUrl);
    console.log('[WebRTC API Config] Using custom TURN server:', host, 'port:', port);
    
    // Generate separate RTCIceServer entries per transport for maximum relay candidate generation
    iceServers.push(
      {
        urls: `turn:${host}:${port}`,
        username: turnUsername,
        credential: turnPassword,
      },
      {
        urls: `turn:${host}:${port}?transport=tcp`,
        username: turnUsername,
        credential: turnPassword,
      },
      {
        urls: `turn:${host}:443`,
        username: turnUsername,
        credential: turnPassword,
      },
      {
        urls: `turn:${host}:443?transport=tcp`,
        username: turnUsername,
        credential: turnPassword,
      },
      {
        urls: `turns:${host}:443?transport=tcp`,
        username: turnUsername,
        credential: turnPassword,
      }
    );
    usedSource = 'custom-env';
  } else {
    console.log('[WebRTC API Config] Using Metered Open Relay TURN fallback.');
    iceServers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:80?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    );
    usedSource = 'openrelay-fallback';
  }

  return NextResponse.json({ 
    iceServers,
    debug: {
      source: usedSource,
      envKeysFound: turnKeysFound,
      iceServerCount: iceServers.length,
    }
  });
}
