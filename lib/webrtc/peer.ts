import { getWebRTCConfig, WebRTCConfig } from './config';

export class WebRTCPeer {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(config?: WebRTCConfig) {
    const rtcConfig = config || getWebRTCConfig();
    this.peerConnection = new RTCPeerConnection({ iceServers: rtcConfig.iceServers });

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] ontrack fired, track kind:', event.track.kind, 'id:', event.track.id, 'muted:', event.track.muted);
      
      event.track.onmute = () => {
        console.warn('[WebRTC] Remote track muted (RTP media packets paused/blocked):', event.track.kind, event.track.id);
      };
      event.track.onunmute = () => {
        console.log('[WebRTC] Remote track unmuted (RTP media packets actively flowing!):', event.track.kind, event.track.id);
      };

      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
      }

      if (this.onRemoteStream && this.remoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candStr = event.candidate.candidate || '';
        const match = candStr.match(/typ\s+(\w+)/);
        const candType = event.candidate.type || (match ? match[1] : 'candidate');
        console.log('[WebRTC] Local ICE Candidate gathered:', candType);
        if (this.onIceCandidate) {
          this.onIceCandidate(event.candidate.toJSON());
        }
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE Connection State:', this.peerConnection.iceConnectionState);
      if (this.peerConnection.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE connection failed. Retrying ICE candidate gathering...');
        try {
          if ('restartIce' in this.peerConnection) {
            (this.peerConnection as any).restartIce();
          }
        } catch (e) {
          console.warn('[WebRTC] Could not restart ICE:', e);
        }
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Peer Connection State:', this.peerConnection.connectionState);
    };
  }

  async setLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    const senders = this.peerConnection.getSenders();
    stream.getTracks().forEach((track) => {
      console.log(`[WebRTC Local Track] kind: ${track.kind}, label: "${track.label}", readyState: ${track.readyState}, enabled: ${track.enabled}, muted: ${track.muted}`);
      const alreadyAdded = senders.some((sender) => sender.track?.id === track.id);
      if (!alreadyAdded) {
        this.peerConnection.addTrack(track, stream);
      }
    });
  }

  setOnRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStream = callback;
    if (this.remoteStream) {
      callback(this.remoteStream);
    }
  }

  setOnIceCandidate(callback: (candidate: RTCIceCandidateInit) => void): void {
    this.onIceCandidate = callback;
  }

  async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer(options);
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    console.log(`[WebRTC] setRemoteDescription completed successfully. Draining ${this.pendingCandidates.length} queued ICE candidates...`);
    
    // Drain queued ICE candidates now that remote description is set
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] Successfully added queued ICE candidate');
        } catch (e) {
          console.warn('[WebRTC] Error adding queued ICE candidate:', e);
        }
      }
    }
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      console.log('[WebRTC] Remote description not ready, queuing ICE candidate');
      this.pendingCandidates.push(candidate);
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getConnectionState(): RTCPeerConnectionState {
    return this.peerConnection.connectionState;
  }

  getPeerConnection(): RTCPeerConnection {
    return this.peerConnection;
  }

  close(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    this.peerConnection.close();
  }
}
