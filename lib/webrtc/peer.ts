import { getWebRTCConfig } from './config';

export class WebRTCPeer {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor() {
    const config = getWebRTCConfig();
    this.peerConnection = new RTCPeerConnection({ iceServers: config.iceServers });

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
        console.log('[WebRTC] Local ICE Candidate gathered:', event.candidate.type || event.candidate.candidate.split(' ')[7]);
        if (this.onIceCandidate) {
          this.onIceCandidate(event.candidate.toJSON());
        }
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE Connection State:', this.peerConnection.iceConnectionState);
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Peer Connection State:', this.peerConnection.connectionState);
    };
  }

  async setLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    const senders = this.peerConnection.getSenders();
    stream.getTracks().forEach((track) => {
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
    
    // Drain queued ICE candidates now that remote description is set
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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
