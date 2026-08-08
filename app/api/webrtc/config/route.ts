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

// Fetch fresh, time-scoped TURN credentials from Metered's API
async function fetchMeteredCredentials(apiKey: string): Promise<RTCIceServer[] | null> {
  try {
    const res = await fetch(
      `https://pod-tube.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const creds = await res.json();
      console.log('[WebRTC API Config] Fetched fresh Metered TURN credentials:', creds.length, 'servers');
      return creds;
    }
    console.warn('[WebRTC API Config] Metered API returned status:', res.status);
  } catch (e) {
    console.warn('[WebRTC API Config] Failed to fetch Metered credentials:', e);
  }
  return null;
}

export async function GET() {
  const turnServerUrl = findEnvVar('TURN_SERVER_URL');
  const turnUsername = findEnvVar('TURN_SERVER_USERNAME');
  const turnPassword = findEnvVar('TURN_SERVER_PASSWORD');
  const meteredApiKey = findEnvVar('METERED_API_KEY');

  const turnKeysFound = Object.keys(process.env).filter(k => k.toLowerCase().includes('turn') || k.toLowerCase().includes('metered'));

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ];

  let usedSource = 'none';

  // Strategy 1: Fresh time-scoped credentials from Metered API (best option)
  if (meteredApiKey) {
    const meteredServers = await fetchMeteredCredentials(meteredApiKey);
    if (meteredServers && meteredServers.length > 0) {
      iceServers.push(...meteredServers);
      usedSource = 'metered-api-fresh';
    }
  }

  // Strategy 2: Static TURN credentials from environment variables
  if (usedSource === 'none' && turnServerUrl && turnUsername && turnPassword) {
    const cleanUrl = turnServerUrl.replace(/^(turn|turns):/i, '').split('?')[0];
    console.log('[WebRTC API Config] Using static TURN credentials for:', cleanUrl);
    iceServers.push(
      {
        urls: `turn:${cleanUrl}:80`,
        username: turnUsername,
        credential: turnPassword,
      },
      {
        urls: `turn:${cleanUrl}:80?transport=tcp`,
        username: turnUsername,
        credential: turnPassword,
      },
      {
        urls: `turn:${cleanUrl}:443`,
        username: turnUsername,
        credential: turnPassword,
      },
      {
        urls: `turn:${cleanUrl}:443?transport=tcp`,
        username: turnUsername,
        credential: turnPassword,
      },
      {
        urls: `turns:${cleanUrl}:443?transport=tcp`,
        username: turnUsername,
        credential: turnPassword,
      }
    );
    usedSource = 'static-env';
  }

  // Strategy 3: Hardcoded Metered Open Relay fallback (free, may be throttled)
  if (usedSource === 'none') {
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
