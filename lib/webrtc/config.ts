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
    console.log('[WebRTC] Using TURN server:', turnServerUrl);
    iceServers.push({
      urls: turnServerUrl,
      username: turnUsername,
      credential: turnPassword,
    });
  } else {
    console.warn('[WebRTC] No TURN server configured (NEXT_PUBLIC_TURN_SERVER_URL). Cross-network WebRTC connections may fail due to NAT/firewalls.');
  }

export async function fetchWebRTCConfig(): Promise<WebRTCConfig> {
  try {
    const res = await fetch('/api/webrtc/config');
    if (res.ok) {
      const data = await res.json();
      if (data.iceServers && Array.isArray(data.iceServers)) {
        const hasTurn = data.iceServers.some((s: RTCIceServer) => 
          Array.isArray(s.urls) ? s.urls.some(u => u.startsWith('turn:')) : (s.urls as string)?.startsWith('turn:')
        );
        if (hasTurn) {
          console.log('[WebRTC] Successfully loaded TURN server configuration from runtime API');
        } else {
          console.warn('[WebRTC] API returned iceServers without TURN credentials. Cross-network WebRTC connections may fail.');
        }
        return { iceServers: data.iceServers };
      }
    }
  } catch (err) {
    console.warn('[WebRTC] Failed to fetch /api/webrtc/config, falling back to static config:', err);
  }

  return getWebRTCConfig();
}
