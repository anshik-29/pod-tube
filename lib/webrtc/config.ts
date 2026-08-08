export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export function getWebRTCConfig(): WebRTCConfig {
  const turnServerUrl = process.env.NEXT_PUBLIC_TURN_SERVER_URL || process.env.TURN_SERVER_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_SERVER_USERNAME || process.env.TURN_SERVER_USERNAME;
  const turnPassword = process.env.NEXT_PUBLIC_TURN_SERVER_PASSWORD || process.env.TURN_SERVER_PASSWORD;

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ];

  if (turnServerUrl && turnUsername && turnPassword) {
    const cleanUrl = turnServerUrl.replace(/^(turn|turns):/i, '').split('?')[0];
    console.log('[WebRTC] Using custom TURN server:', cleanUrl);
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
    console.log('[WebRTC] Using Metered Open Relay TURN fallback');
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

  return { iceServers };
}

export async function fetchWebRTCConfig(): Promise<WebRTCConfig> {
  try {
    const res = await fetch('/api/webrtc/config');
    if (res.ok) {
      const data = await res.json();
      console.log('[WebRTC] fetchWebRTCConfig response:', data);
      if (data.iceServers && Array.isArray(data.iceServers)) {
        const hasTurn = data.iceServers.some((s: RTCIceServer) => {
          const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
          return urls.some(u => typeof u === 'string' && (u.startsWith('turn:') || u.startsWith('turns:')));
        });
        if (hasTurn) {
          console.log('[WebRTC] Successfully loaded TURN server configuration from runtime API');
        }
        return { iceServers: data.iceServers };
      }
    }
  } catch (err) {
    console.warn('[WebRTC] Failed to fetch /api/webrtc/config, falling back to static config:', err);
  }

  return getWebRTCConfig();
}
