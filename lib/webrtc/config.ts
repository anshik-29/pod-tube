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

  return { iceServers };
}
