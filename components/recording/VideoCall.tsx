'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { WebRTCPeer } from '@/lib/webrtc/peer';
import { BrowserRecorder } from '@/lib/recording/recorder';
import { ChunkUploadQueue } from '@/lib/recording/upload-queue';
import { DeviceSelector } from './DeviceSelector';
import { useAuth } from '@/components/providers/AuthProvider';

interface VideoCallProps {
  sessionId: string;
  isHost: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
  guestToken?: string;
}

export function VideoCall({ sessionId, isHost, onRecordingStateChange, guestToken }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peer, setPeer] = useState<WebRTCPeer | null>(null);
  const [recorder, setRecorder] = useState<BrowserRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [hasRequestedMedia, setHasRequestedMedia] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | null>(null);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const hasRemoteStream = !!remoteStream;
  const [remoteVolume, setRemoteVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isRemoteCamOff, setIsRemoteCamOff] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedGuestLink, setCopiedGuestLink] = useState(false);
  const [disconnectWarning, setDisconnectWarning] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [completedEpisodeId, setCompletedEpisodeId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const uploadQueueRef = useRef<ChunkUploadQueue | null>(null);
  const [uploadStats, setUploadStats] = useState<{ uploaded: number; pending: number; failed: number; total: number } | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<WebRTCPeer | null>(null);
  const recorderRef = useRef<BrowserRecorder | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isRecordingRef = useRef(false);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const streamCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOpeningExternalLinkRef = useRef(false);
  const recordingTimestampsRef = useRef<{ startedAt: string; endedAt: string } | null>(null);

  useEffect(() => {
    // Show device selector first
    setShowDeviceSelector(true);
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update recording duration timer
  useEffect(() => {
    if (!isRecording || !recordingStartTime) {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - recordingStartTime.getTime()) / 1000);
      setRecordingDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  // Attach remote stream to video element when both element and stream exist
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.volume = remoteVolume / 100;
    }
  }, [remoteStream, remoteVolume]);

  // Listen for upload completion events to set episode link & toast
  const [hasFinishedRecording, setHasFinishedRecording] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Listen for upload completion events
  useEffect(() => {
    const handleUploaded = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { episodeId } = customEvent.detail || {};
      if (episodeId) {
        setCompletedEpisodeId(episodeId);
      }
      setShowSuccessToast(true);
      setShowUploadModal(true);
    };

    const handleUploadError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { error } = customEvent.detail || {};
      if (error) {
        setMediaError(`Upload error: ${error}`);
      }
    };

    window.addEventListener('recording-uploaded', handleUploaded);
    window.addEventListener('recording-upload-error', handleUploadError);

    return () => {
      window.removeEventListener('recording-uploaded', handleUploaded);
      window.removeEventListener('recording-upload-error', handleUploadError);
    };
  }, []);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!selectedVideoDevice || !selectedAudioDevice) return;
    
    // Don't reinitialize if we already have an active connection and stream
    if (socket && peer && localStreamRef.current && localStreamRef.current.getTracks().some(t => t.readyState === 'live')) {
      console.log('Stream already active, skipping reinitialization');
      return;
    }

    // Initialize Socket.io - use current origin (works in both dev and production)
    // In production, use the same origin as the page. In dev, fallback to localhost
    const socketUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000');
    const socketInstance = io(socketUrl);
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      socketInstance.emit('join-session', sessionId);
      initializeWebRTC(socketInstance, selectedVideoDevice, selectedAudioDevice);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    return () => {
      // Only cleanup if we're not just opening an external link
      if (!isOpeningExternalLinkRef.current) {
        cleanup(true);
        socketInstance.disconnect();
      } else {
        // Just disconnect socket, don't cleanup media
        socketInstance.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, selectedVideoDevice, selectedAudioDevice]);

  // Cleanup function to stop all media tracks and close connections
  const cleanup = (skipIfExternalLink = false) => {
    // Don't cleanup if we're just opening an external link (like mailto)
    if (skipIfExternalLink && isOpeningExternalLinkRef.current) {
      console.log('Skipping cleanup - external link is being opened');
      isOpeningExternalLinkRef.current = false;
      return;
    }

    console.log('Cleaning up media tracks and connections...');

    // Clear stream check interval
    if (streamCheckIntervalRef.current) {
      clearInterval(streamCheckIntervalRef.current);
      streamCheckIntervalRef.current = null;
    }

    // Stop recording if active
    if (recorderRef.current && isRecordingRef.current) {
      try {
        recorderRef.current.stopRecording().catch(console.error);
      } catch (error) {
        console.error('Error stopping recording during cleanup:', error);
      }
    }

    // Stop all local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('Stopped local track:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Stop all remote media tracks
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('Stopped remote track:', track.kind);
      });
      remoteStreamRef.current = null;
    }
    setRemoteStream(null);

    // Clear video element sources
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Close peer connection
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
      console.log('Closed peer connection');
    }

    // Cleanup recorder
    if (recorderRef.current) {
      recorderRef.current.cleanup();
      recorderRef.current = null;
      console.log('Cleaned up recorder');
    }
  };

  // Cleanup on page unload/navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      // Only cleanup on actual page unload, not when opening external links
      if (!isOpeningExternalLinkRef.current) {
        cleanup();
      }
    };
  }, []);

  const requestMediaPermissions = async (videoDeviceId?: string, audioDeviceId?: string) => {
    try {
      setMediaError(null);
      const constraints: MediaStreamConstraints = {
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error: any) {
      let errorMessage = 'Unable to access camera and microphone.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera and microphone access was denied. Please allow access in your browser settings and refresh the page.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a device and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera or microphone is already in use by another application.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Camera or microphone settings are not supported.';
      }
      
      setMediaError(errorMessage);
      throw error;
    }
  };

  const initializeWebRTC = async (socketInstance: Socket, videoDeviceId?: string, audioDeviceId?: string) => {
    try {
      // Get user media with selected devices
      const stream = await requestMediaPermissions(videoDeviceId, audioDeviceId);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Store stream reference for cleanup
      localStreamRef.current = stream;

      // Monitor track state changes to detect when tracks are stopped unexpectedly
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          console.warn(`Track ${track.kind} ended unexpectedly. State: ${track.readyState}`);
          // If track ends and we're not intentionally stopping, try to restore
          if (track.readyState === 'ended' && localStreamRef.current && !isRecordingRef.current) {
            console.log('Attempting to restore media stream...');
            // Re-request media with the same device IDs
            setTimeout(async () => {
              try {
                const newStream = await requestMediaPermissions(videoDeviceId, audioDeviceId);
                if (localVideoRef.current) {
                  localVideoRef.current.srcObject = newStream;
                }
                localStreamRef.current = newStream;
                // Update peer connection with new stream
                if (peerRef.current) {
                  await peerRef.current.setLocalStream(newStream);
                }
                setMediaError(null);
              } catch (error) {
                console.error('Failed to restore stream:', error);
                setMediaError(`Your ${track.kind} was stopped. Please check your device permissions.`);
              }
            }, 100);
          }
        };
        
        track.onmute = () => {
          console.log(`Track ${track.kind} was muted`);
        };
        
        track.onunmute = () => {
          console.log(`Track ${track.kind} was unmuted`);
        };
      });
      
      // Clear any existing interval
      if (streamCheckIntervalRef.current) {
        clearInterval(streamCheckIntervalRef.current);
      }
      
      // Periodically check if video element still has the stream
      streamCheckIntervalRef.current = setInterval(() => {
        if (localVideoRef.current && localStreamRef.current) {
          const currentSrcObject = localVideoRef.current.srcObject;
          // Only restore if srcObject is actually null/undefined, not just different reference
          // (different references can be valid if stream was recreated)
          if (!currentSrcObject && localStreamRef.current.getTracks().some(t => t.readyState === 'live')) {
            console.warn('Video element lost stream reference, restoring...');
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          
          // Check if tracks are still active
          const videoTracks = localStreamRef.current.getVideoTracks();
          const inactiveTracks = videoTracks.filter(t => t.readyState !== 'live');
          if (inactiveTracks.length > 0 && !isRecordingRef.current) {
            // Only warn if all tracks are inactive, not just some
            if (inactiveTracks.length === videoTracks.length) {
              console.warn('All video tracks became inactive:', inactiveTracks.map(t => t.readyState));
            }
          }
        }
      }, 5000); // Check every 5 seconds (less aggressive)

      // Store audio and video tracks for mute/unmute and camera control
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrackRef.current = audioTrack;
      }
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrackRef.current = videoTrack;
      }

      // Create peer connection
      const peerInstance = new WebRTCPeer();
      await peerInstance.setLocalStream(stream);

      peerInstance.setOnRemoteStream((rStream) => {
        console.log('[VideoCall] Remote MediaStream received via WebRTC ontrack:', rStream.getTracks());
        remoteStreamRef.current = rStream;
        setRemoteStream(rStream);

        rStream.getVideoTracks().forEach((track) => {
          track.onended = () => setIsRemoteCamOff(true);
        });
      });

      // Set up ICE candidate handler to send candidates via Socket.io
      peerInstance.setOnIceCandidate((candidate) => {
        socketInstance.emit('webrtc-ice-candidate', { sessionId, candidate });
      });

      setPeer(peerInstance);
      peerRef.current = peerInstance;

      // Initialize recorder
      const recorderInstance = new BrowserRecorder();
      setRecorder(recorderInstance);
      recorderRef.current = recorderInstance;

      // WebRTC signaling - handle dynamic join/leave
      const handleCreateOffer = async () => {
        if (isHost && peerRef.current) {
          console.log('[Socket.IO] Host creating fresh WebRTC offer...');
          try {
            const peerConn = peerRef.current.getPeerConnection();
            const offerOptions: RTCOfferOptions = peerConn.signalingState !== 'stable' 
              ? { iceRestart: true } 
              : {};
            const offer = await peerRef.current.createOffer(offerOptions);
            socketInstance.emit('webrtc-offer', { sessionId, offer });
          } catch (err) {
            console.error('Error creating offer:', err);
          }
        }
      };

      const syncLocalMediaState = () => {
        const s = socketRef.current || socketInstance;
        const vTrack = videoTrackRef.current || localStreamRef.current?.getVideoTracks()[0];
        const aTrack = audioTrackRef.current || localStreamRef.current?.getAudioTracks()[0];
        if (vTrack && s) {
          s.emit('media-toggle', { sessionId, type: 'camera', enabled: vTrack.enabled });
        }
        if (aTrack && s) {
          s.emit('media-toggle', { sessionId, type: 'mic', enabled: aTrack.enabled });
        }
      };

      socketInstance.on('user-joined', async () => {
        console.log('[Socket.IO] A new participant joined the session');
        await handleCreateOffer();
        syncLocalMediaState();
      });

      socketInstance.on('webrtc-request-offer', async () => {
        console.log('[Socket.IO] Received offer request from participant');
        await handleCreateOffer();
        syncLocalMediaState();
      });

      socketInstance.on('user-left', () => {
        console.log('[Socket.IO] A participant left the session');
        setRemoteStream(null);
        remoteStreamRef.current = null;
        setIsRemoteCamOff(false);
        setIsRemoteMuted(false);
      });

      if (isHost) {
        await handleCreateOffer();
      } else {
        // Guest requests offer from Host upon joining
        console.log('[Socket.IO] Guest requesting offer from Host...');
        socketInstance.emit('webrtc-request-offer', { sessionId });
      }

      socketInstance.on('webrtc-offer', async (data: { offer: RTCSessionDescriptionInit }) => {
        if (!isHost && peerRef.current) {
          console.log('[Socket.IO] Guest received WebRTC offer, setting remote description & creating answer...');
          try {
            await peerRef.current.setRemoteDescription(data.offer);
            const answer = await peerRef.current.createAnswer();
            socketInstance.emit('webrtc-answer', { sessionId, answer });
            syncLocalMediaState();
          } catch (err) {
            console.error('Error handling WebRTC offer:', err);
          }
        }
      });

      socketInstance.on('webrtc-answer', async (data: { answer: RTCSessionDescriptionInit }) => {
        if (isHost && peerRef.current) {
          console.log('[Socket.IO] Host received WebRTC answer, setting remote description');
          try {
            await peerRef.current.setRemoteDescription(data.answer);
            syncLocalMediaState();
          } catch (err) {
            console.error('Error setting remote answer:', err);
          }
        }
      });

      socketInstance.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
        if (peerRef.current && data.candidate) {
          try {
            await peerRef.current.addIceCandidate(data.candidate);
          } catch (err) {
            console.warn('Error adding ICE candidate:', err);
          }
        }
      });

      socketInstance.on('media-toggle', (data: { type: 'camera' | 'mic'; enabled: boolean }) => {
        console.log('[Socket.IO] Remote media-toggle event received:', data);
        if (data.type === 'camera') {
          setIsRemoteCamOff(!data.enabled);
        } else if (data.type === 'mic') {
          setIsRemoteMuted(!data.enabled);
        }
      });

      // ICE candidate handling
      peerInstance.getLocalStream()?.getTracks().forEach(() => {
        // ICE candidates are handled by the peer connection's onicecandidate
      });

      // Listen for synchronized recording start/stop signals
      socketInstance.on('recording:start', () => {
        console.log('[Socket.IO] Received recording:start event. Triggering local participant recording...');
        startLocalRecording();
      });

      socketInstance.on('recording:stop', () => {
        console.log('[Socket.IO] Received recording:stop event. Stopping local participant recording...');
        stopLocalRecording();
      });

      // Monitor connection state for disconnects
      const peerConnection = peerInstance.getPeerConnection();
      if (peerConnection) {
        peerConnection.oniceconnectionstatechange = () => {
          const state = peerConnection.iceConnectionState;
          if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            setRemoteStream(null);
            remoteStreamRef.current = null;
            setIsRemoteCamOff(false);
            setIsRemoteMuted(false);
            if (isRecordingRef.current) {
              setDisconnectWarning(
                isHost 
                  ? 'Guest has disconnected. Recording will continue with your audio/video only.'
                  : 'Connection lost. Recording will continue with host audio/video only.'
              );
            } else {
              setDisconnectWarning('Connection lost. Please check your internet connection.');
            }
          } else if (state === 'connected' || state === 'completed') {
            setDisconnectWarning(null);
          }
        };

        peerConnection.onconnectionstatechange = () => {
          const state = peerConnection.connectionState;
          if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            setRemoteStream(null);
            remoteStreamRef.current = null;
            setIsRemoteCamOff(false);
            setIsRemoteMuted(false);
            if (isRecordingRef.current) {
              setDisconnectWarning(
                isHost 
                  ? 'Guest has disconnected. Recording will continue with your audio/video only.'
                  : 'Connection lost. Recording will continue with host audio/video only.'
              );
            }
          } else if (state === 'connected') {
            setDisconnectWarning(null);
          }
        };
      }

      // Monitor socket disconnects
      socketInstance.on('disconnect', () => {
        if (isRecordingRef.current) {
          setDisconnectWarning('Connection lost. Recording will continue locally.');
        } else {
          setDisconnectWarning('Connection lost. Please refresh the page.');
        }
      });

      socketInstance.on('connect', () => {
        setDisconnectWarning(null);
      });

      setIsConnected(true);
      setHasRequestedMedia(true);
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      setHasRequestedMedia(true);
    }
  };

  const finalizeAndCompleteRecording = async (totalChunks: number) => {
    setUploading(true);
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
      const participantType: 'host' | 'guest' = isHost ? 'host' : 'guest';

      console.log(`[Finalize] Finalizing participant=${participantType} upload...`);

      const finalizeRes = await fetch('/api/upload/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId,
          participantType,
          totalChunks,
          recordingDuration,
          recordingStartedAt: recordingTimestampsRef.current?.startedAt,
          recordingEndedAt: recordingTimestampsRef.current?.endedAt,
        }),
      });

      if (!finalizeRes.ok) {
        const errData = await finalizeRes.json();
        throw new Error(errData.error || 'Failed to finalize chunk assembly');
      }

      const finalizeData = await finalizeRes.json();
      console.log(`[Finalize] Participant ${participantType} finalize complete:`, finalizeData);

      if (typeof window !== 'undefined' && finalizeData.episodeId) {
        window.dispatchEvent(
          new CustomEvent('recording-uploaded', {
            detail: { episodeId: finalizeData.episodeId, sessionId },
          })
        );
      }
    } catch (error: any) {
      console.error('Recording finalize/complete error:', error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('recording-upload-error', {
            detail: { error: error?.message || 'Failed to complete recording' },
          })
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const startLocalRecording = async () => {
    if (isRecordingRef.current) {
      console.log('Recording already active on this client');
      return;
    }

    const currentRecorder = recorderRef.current || recorder;
    const currentPeer = peerRef.current || peer;

    if (!currentRecorder || !currentPeer) {
      setMediaError('Recording not ready. Please wait for media to initialize.');
      return;
    }

    const stream = currentPeer.getLocalStream();
    if (!stream) {
      setMediaError('No media stream available. Please check your camera and microphone permissions.');
      return;
    }

    setMediaError(null);

    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
      const participantType: 'host' | 'guest' = isHost ? 'host' : 'guest';

      console.log(`[Recording] Starting local recording as participantType=${participantType}`);

      const queue = new ChunkUploadQueue({
        sessionId,
        participantType,
        authToken,
        concurrency: 3,
        maxRetries: 3,
        onProgress: (stats) => setUploadStats(stats),
        onAllUploadsComplete: async (totalChunks) => {
          console.log(`[UploadQueue] All ${totalChunks} chunks uploaded for ${participantType}. Finalizing recording...`);
          await finalizeAndCompleteRecording(totalChunks);
        },
        onUploadsFailed: (failedCount, totalChunks) => {
          console.error(`[UploadQueue] Upload failed for ${participantType}: ${failedCount}/${totalChunks} chunk(s) failed.`);
          setUploading(false);
          setMediaError(`Recording upload failed: ${failedCount} chunk(s) failed to upload.`);
        },
        onChunkFailed: (chunkIndex, err) => {
          console.error(`[UploadQueue] Chunk ${chunkIndex} permanently failed:`, err);
        },
      });

      uploadQueueRef.current = queue;

      currentRecorder.setChunkHandler({
        onChunk: (chunkIndex, blob) => {
          console.log(`[Recorder] ${participantType} chunk ${chunkIndex} produced (${blob.size} bytes). Enqueuing...`);
          queue.enqueue(chunkIndex, blob);
        },
      });

      await currentRecorder.startRecording(stream, { timesliceMs: 30000 });
      const startTime = new Date();
      setRecordingStartTime(startTime);
      setRecordingDuration(0);
      setIsRecording(true);
      isRecordingRef.current = true;
      setHasFinishedRecording(false);
      setShowUploadModal(false);
      onRecordingStateChange?.(true);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setMediaError(error?.message || 'Failed to start recording.');
    }
  };

  const stopLocalRecording = async () => {
    const currentRecorder = recorderRef.current || recorder;
    if (!currentRecorder || !isRecordingRef.current) return;

    try {
      const participantType = isHost ? 'host' : 'guest';
      console.log(`[Recording] Stopping local recording for participantType=${participantType}...`);

      const result = await currentRecorder.stopRecording();
      const totalChunks = result?.totalChunks ?? currentRecorder.getTotalChunks();

      if (result?.recordingStartedAt && result?.recordingEndedAt) {
        recordingTimestampsRef.current = {
          startedAt: result.recordingStartedAt.toISOString(),
          endedAt: result.recordingEndedAt.toISOString(),
        };
      }

      setIsRecording(false);
      isRecordingRef.current = false;
      setHasFinishedRecording(true);
      setShowUploadModal(true);
      onRecordingStateChange?.(false);
      setUploading(true);

      if (uploadQueueRef.current) {
        uploadQueueRef.current.signalRecordingStopped();
      } else {
        await finalizeAndCompleteRecording(totalChunks);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleHostStartRecording = () => {
    if (!socket || !isConnected) {
      setMediaError('Connection not ready. Cannot start recording.');
      return;
    }
    console.log('[Host] Emitting recording:start via socket...');
    socket.emit('recording:start', { sessionId });
  };

  const handleHostStopRecording = () => {
    if (!socket || !isConnected) {
      setMediaError('Connection not ready. Cannot stop recording.');
      return;
    }
    console.log('[Host] Emitting recording:stop via socket...');
    socket.emit('recording:stop', { sessionId });
  };

  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string>(user?.name || (isHost ? 'Host' : 'Guest'));

  const handleDevicesSelected = (videoDeviceId: string, audioDeviceId: string, name?: string) => {
    setSelectedVideoDevice(videoDeviceId);
    setSelectedAudioDevice(audioDeviceId);
    if (name && name.trim()) {
      setDisplayName(name.trim());
    }
    setShowDeviceSelector(false);
  };

  const handleRemoteVolumeChange = (value: number) => {
    setRemoteVolume(value);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = value / 100;
    }
  };

  const toggleMute = () => {
    let track = audioTrackRef.current;
    if (!track && localStreamRef.current) {
      track = localStreamRef.current.getAudioTracks()[0] || null;
      audioTrackRef.current = track;
    }
    if (track) {
      const newMutedState = !isMuted;
      track.enabled = !newMutedState;
      setIsMuted(newMutedState);
      const activeSocket = socketRef.current || socket;
      if (activeSocket) {
        console.log('[MediaToggle] Emitting mic toggle:', { sessionId, type: 'mic', enabled: !newMutedState });
        activeSocket.emit('media-toggle', { sessionId, type: 'mic', enabled: !newMutedState });
      }
    }
  };

  const toggleCamera = () => {
    let track = videoTrackRef.current;
    if (!track && localStreamRef.current) {
      track = localStreamRef.current.getVideoTracks()[0] || null;
      videoTrackRef.current = track;
    }
    if (track) {
      const newCamState = !isCamOff;
      track.enabled = !newCamState;
      setIsCamOff(newCamState);
      const activeSocket = socketRef.current || socket;
      if (activeSocket) {
        console.log('[MediaToggle] Emitting camera toggle:', { sessionId, type: 'camera', enabled: !newCamState });
        activeSocket.emit('media-toggle', { sessionId, type: 'camera', enabled: !newCamState });
      }
    }
  };

  const getGuestLink = () => {
    if (!guestToken || typeof window === 'undefined') return '';
    return `${window.location.origin}/join/${guestToken}`;
  };

  const handleCopyGuestLink = () => {
    const link = getGuestLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedGuestLink(true);
      setTimeout(() => setCopiedGuestLink(false), 2000);
    }
  };

  const handleEmailGuestLink = () => {
    const link = getGuestLink();
    if (link) {
      const subject = encodeURIComponent('Join my recording session');
      const body = encodeURIComponent(`Hi,\n\nI'd like to invite you to join my recording session. Please use this link:\n\n${link}\n\nYou can join at any time, even if recording has already started.\n\nThanks!`);
      isOpeningExternalLinkRef.current = true;
      const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
      const anchor = document.createElement('a');
      anchor.href = mailtoLink;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => {
        isOpeningExternalLinkRef.current = false;
      }, 100);
    }
  };

  const effectiveRemoteCamOff = isRemoteCamOff;
  const effectiveRemoteMuted = isRemoteMuted;

  if (showDeviceSelector) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-[#09090B] flex items-center justify-center z-50 p-4">
        <DeviceSelector
          onDevicesSelected={handleDevicesSelected}
          onCancel={() => setShowDeviceSelector(false)}
          initialName={user?.name || ''}
          isHost={isHost}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#09090B] flex flex-col select-none overflow-hidden font-sans text-zinc-100 antialiased z-50">

      {/* ─── Desktop App Top Bar (56px) ─── */}
      {/* ─── Top Studio Navbar (Exact Riverside Layout) ─── */}
      <header className="h-14 px-5 bg-[#0e0e11] border-b border-[#222226] flex items-center justify-between z-20 shrink-0 select-none">
        {/* Left Section: Home icon + Studio Name */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => window.history.back()}
            className="w-7 h-7 rounded-lg bg-[#1a1a1e] hover:bg-[#25252b] border border-[#2a2a30] text-slate-300 flex items-center justify-center p-0 transition-colors"
            title="Back to Dashboard"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 00-1 1m-6 0h6" />
            </svg>
          </button>
          <span className="text-xs font-bold text-white tracking-tight truncate max-w-[220px]">
            {hasFinishedRecording ? `${displayName || (isHost ? 'Host' : 'Guest')} ── Take 01` : (isRecording ? (displayName || (isHost ? 'Host' : 'Guest')) : 'Untitled Recording')}
          </span>
        </div>

        {/* Center Section: RED Timer Badge (Screen 3) */}
        <div className="flex items-center gap-3">
          {isRecording ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#e53935] text-white font-mono text-sm font-bold rounded-lg shadow-md">
              <span>{formatDuration(recordingDuration)}</span>
            </div>
          ) : null}
        </div>

        {/* Right Section: Uploading Status & Live Stream */}
        <div className="flex items-center gap-3">
          {(uploading || (uploadStats && uploadStats.pending > 0)) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Uploading</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1a1a1e] border border-[#2a2a30] rounded-xl text-xs font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>((•)) Live stream</span>
          </div>

          <button
            onClick={() => setShowParticipants((p) => !p)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1a1e]"
            title="Toggle Right Panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </button>
        </div>
      </header>

      {/* ─── Main Workspace Area (Video Stage + Right Panels) ─── */}
      <div className="flex-1 flex overflow-hidden relative w-full h-full min-h-0 bg-[#0e0e11]">

        {/* Video Stage Viewport */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative min-w-0 min-h-0 overflow-hidden">
          {!isConnected && !mediaError ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#6e56f8]/30 border-t-[#6e56f8] animate-spin" />
              <span className="text-xs font-medium text-slate-400">Connecting to media stream...</span>
            </div>
          ) : (
            <div className={`w-full h-full max-h-[calc(100vh-160px)] grid gap-4 transition-all duration-300 ${
              hasRemoteStream
                ? (isMobile ? 'grid-cols-1 grid-rows-2' : 'grid-cols-1 md:grid-cols-2')
                : 'grid-cols-1 max-w-4xl mx-auto'
            }`}>
              {/* Local Participant Tile */}
              <div className="relative rounded-2xl overflow-hidden border border-[#26262a] bg-[#141418] shadow-2xl flex items-center justify-center group">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover bg-[#141418] -scale-x-100 ${isCamOff ? 'hidden' : 'block'}`}
                />

                {isCamOff && (
                  <div className="absolute inset-0 z-10 bg-[#141418] flex flex-col items-center justify-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-[#24242a] text-white font-bold text-2xl flex items-center justify-center shadow-xl border border-white/10">
                      {(displayName || (isHost ? 'Host' : 'Guest')).charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Bottom-left Name Tag (Exact Riverside Design) */}
                <div className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs font-bold text-white">
                  {displayName || (isHost ? 'Host' : 'Guest')}
                </div>
              </div>

              {/* Remote Participant Tile */}
              {hasRemoteStream && (
                <div className="relative rounded-2xl overflow-hidden border border-[#26262a] bg-[#141418] shadow-2xl flex items-center justify-center group">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover bg-[#141418] -scale-x-100 ${effectiveRemoteCamOff ? 'hidden' : 'block'}`}
                  />
                  {effectiveRemoteCamOff && (
                    <div className="absolute inset-0 z-10 bg-[#141418] flex flex-col items-center justify-center gap-3">
                      <div className="w-20 h-20 rounded-full bg-[#24242a] text-white font-bold text-2xl flex items-center justify-center shadow-xl border border-white/10">
                        {isHost ? 'G' : 'H'}
                      </div>
                    </div>
                  )}

                  {effectiveRemoteMuted && (
                    <div className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-red-500/80 backdrop-blur-md text-white shadow-md flex items-center gap-1.5 text-xs font-bold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth={2} />
                      </svg>
                      <span>Muted</span>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs font-bold text-white flex items-center gap-2">
                    <span>{isHost ? 'Guest' : 'Host'}</span>
                    {effectiveRemoteMuted && <span className="text-red-400 font-normal text-[10px]">(Muted)</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Thumbnail Preview Pill (Host only post-recording) */}
          {hasFinishedRecording && isHost && (
            <div className="mt-3 mb-2 flex items-center justify-center">
              <div className="w-16 h-10 bg-black rounded-lg border border-[#2c2c34] relative overflow-hidden flex items-center justify-center shadow-xl">
                <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white bg-black/80 px-1 rounded">00:11</span>
              </div>
            </div>
          )}

          {/* ─── Post-Recording Overlay Modal ─── */}
          {hasFinishedRecording && (uploading || showUploadModal) && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              {isHost ? (
                /* Host View: Project Link & Upload Status */
                <div className="bg-[#18191e] border border-[#2a2a32] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between text-left">
                    <h3 className="text-sm font-bold text-white">Upload status • {displayName || 'Host'}</h3>
                    <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
                  </div>
                  <p className="text-xs text-slate-400 text-left">Track uploads from all participants.</p>

                  <div className="p-3 bg-[#121317] rounded-xl border border-[#24252c] flex items-center gap-3">
                    <div className="w-12 h-9 bg-black rounded-lg border border-[#28282e] overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-300">
                      {(displayName || 'Host').substring(0, 4)}
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-xs font-bold text-white">{displayName || 'Host'}</div>
                      <div className="text-[11px] text-slate-400">
                        {uploading ? 'Finalizing upload...' : 'Uploaded 100%'}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={completedEpisodeId ? `/episodes/${completedEpisodeId}` : '/episodes'}
                    className="w-full py-2.5 bg-[#6e56f8] hover:bg-[#5e44f6] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Go to project</span>
                    <span>↗</span>
                  </Link>
                </div>
              ) : (
                /* Guest View: Clean Thank You Feedback Modal (No Recording/Project Link) */
                <div className="bg-[#18191e] border border-[#2a2a32] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">Thank you for joining!</h3>
                    <p className="text-xs text-slate-400">
                      Your local recording track has been saved and uploaded to the host studio.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      cleanup();
                      window.history.back();
                    }}
                    className="w-full py-2.5 bg-[#24252c] hover:bg-[#2c2d36] text-slate-200 rounded-xl text-xs font-bold border border-[#30313a] transition-colors"
                  >
                    Leave Studio
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── Floating Bottom Controls Dock (Exact Riverside Screen 2, 3, 4 Dock) ─── */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 p-2 rounded-2xl bg-[#121215] border border-[#222226] shadow-2xl">
            {/* Record / Stop Button */}
            {isHost && (
              isRecording ? (
                <button
                  onClick={handleHostStopRecording}
                  className="px-4 py-2 bg-[#382024] hover:bg-[#4a282d] text-white rounded-xl flex flex-col items-center justify-center font-bold text-xs gap-1 min-w-[64px] transition-colors"
                  title="Stop Recording"
                >
                  <div className="w-3.5 h-3.5 bg-red-500 rounded-sm"></div>
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  onClick={handleHostStartRecording}
                  className="px-4 py-2 bg-[#e53935] hover:bg-[#d32f2f] text-white rounded-xl flex flex-col items-center justify-center font-bold text-xs gap-1 min-w-[64px] transition-colors"
                  title="Start Recording"
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                  <span>Record</span>
                </button>
              )
            )}

            {/* Mark Button (During Recording - Screen 3) */}
            {isRecording && (
              <button className="px-3 py-2 text-slate-300 hover:text-white flex flex-col items-center justify-center text-xs gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Mark</span>
              </button>
            )}

            {/* Audio Toggle */}
            <button
              onClick={toggleMute}
              className={`px-3 py-2 flex flex-col items-center justify-center text-xs gap-1 transition-colors ${
                isMuted ? 'text-red-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Audio</span>
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleCamera}
              className={`px-3 py-2 flex flex-col items-center justify-center text-xs gap-1 transition-colors ${
                isCamOff ? 'text-red-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Video</span>
            </button>

            {/* Share */}
            <button className="px-3 py-2 text-slate-300 hover:text-white flex flex-col items-center justify-center text-xs gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Share</span>
            </button>

            {/* React */}
            <button className="px-3 py-2 text-slate-300 hover:text-white flex flex-col items-center justify-center text-xs gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>React</span>
            </button>

            {/* Script */}
            <button className="px-3 py-2 text-slate-300 hover:text-white flex flex-col items-center justify-center text-xs gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Script</span>
            </button>

            {/* Layout */}
            <button className="px-3 py-2 text-slate-300 hover:text-white flex flex-col items-center justify-center text-xs gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Layout</span>
            </button>

            {/* Leave */}
            <button
              onClick={() => { cleanup(); window.history.back(); }}
              className="px-3 py-2 text-red-400 hover:text-red-300 flex flex-col items-center justify-center text-xs gap-1 ml-1"
              title="Leave Studio"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Leave</span>
            </button>
          </div>
        </main>

        {/* People Panel Sidebar (Screen 2) */}
        <aside
          className={`bg-[#0d0d11] border-l border-[#1f1f23] flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${
            showParticipants ? 'w-[280px]' : 'w-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="h-14 px-4 border-b border-[#1f1f23] flex items-center justify-between shrink-0">
            <span className="text-sm font-bold text-white">People</span>
            <button onClick={() => setShowParticipants(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-3 bg-[#18181c] border border-[#26262c] rounded-xl text-left hover:bg-[#202026]"
              >
                <div className="text-xs font-bold text-white">Invite via link or email</div>
              </button>
              <button className="p-3 bg-[#18181c] border border-[#26262c] rounded-xl text-left hover:bg-[#202026]">
                <div className="text-xs font-bold text-white">Add in-person guest</div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-300">
                In the studio <span className="bg-[#24242a] px-1.5 py-0.5 rounded text-[10px]">{hasRemoteStream ? 2 : 1}</span>
              </span>
              <button className="text-xs font-bold text-slate-400 hover:text-white">Mute all</button>
            </div>

            {/* Local Participant Card */}
            <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262c] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#282830] rounded-xl flex items-center justify-center font-bold text-white text-sm">
                  {(displayName || (isHost ? 'Host' : 'Guest')).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{displayName || (isHost ? 'Host' : 'Guest')} (You)</div>
                  <div className="text-[11px] text-slate-400">{isHost ? 'Host' : 'Guest'} • 720p</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {isCamOff && (
                  <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] font-semibold" title="Camera is off">Cam Off</span>
                )}
                {isMuted && (
                  <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] font-semibold" title="Microphone muted">Muted</span>
                )}
              </div>
            </div>

            {/* Remote Participant Card */}
            {hasRemoteStream && (
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262c] flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#6e56f8]/20 border border-[#6e56f8]/40 rounded-xl flex items-center justify-center font-bold text-[#6e56f8] text-sm">
                    {isHost ? 'G' : 'H'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{isHost ? 'Guest' : 'Host'}</div>
                    <div className="text-[11px] text-slate-400">{isHost ? 'Guest' : 'Host'} • 720p</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {effectiveRemoteCamOff && (
                    <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] font-semibold" title="Camera is off">Cam Off</span>
                  )}
                  {effectiveRemoteMuted && (
                    <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] font-semibold" title="Microphone muted">Muted</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Far-Right Vertical Tool Strip (Exact Riverside Strip) */}
        <div className="w-14 bg-[#0d0d11] border-l border-[#1f1f23] flex flex-col items-center gap-5 py-4 text-[10px] text-slate-400 select-none">
          <button onClick={() => setShowParticipants((p) => !p)} className="flex flex-col items-center gap-1 hover:text-white text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span>People</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span>Chat</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <span>Stream</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            <span>Brand</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white">
            <span className="font-bold text-sm leading-none">T</span>
            <span>Text</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
            <span>Media</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            <span>Settings</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white mt-auto">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* ─── Invite Guest Modal Overlay (Riverside Design System) ─── */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
        >
          <div className="bg-[#18191e] border border-[#262833] rounded-2xl p-6 max-w-lg w-full text-slate-100 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Invite people</h3>
                <p className="text-xs text-slate-400 mt-1">Invite people to join you for a recording session.</p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-8 h-8 rounded-xl bg-[#222430] hover:bg-[#2c2e3d] text-slate-400 hover:text-white flex items-center justify-center p-0 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Share a Link Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>🔗 Share a link</span>
              </label>
              <p className="text-[11px] text-slate-400">Copy the link below and share with others.</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={getGuestLink()}
                  readOnly
                  className="flex-1 bg-[#121318] border border-[#282a36] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono outline-none truncate"
                />
                <select className="bg-[#121318] border border-[#282a36] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-300">
                  <option value="guest">Guest</option>
                  <option value="audience">Audience</option>
                </select>
                <button
                  onClick={handleCopyGuestLink}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    copiedGuestLink
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#6e56f8] hover:bg-[#5e44f6] text-white shadow-md shadow-[#6e56f8]/20'
                  }`}
                >
                  {copiedGuestLink ? '✓ Copied' : 'Copy link'}
                </button>
              </div>
            </div>

            <div className="relative flex justify-center text-xs">
              <div className="w-full border-t border-[#262833] absolute top-1/2"></div>
              <span className="bg-[#18191e] px-3 text-slate-500 relative z-10 font-medium">Or</span>
            </div>

            {/* Invite via Email Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>✉️ Invite via email</span>
              </label>
              <p className="text-[11px] text-slate-400">An email with instructions on how to join will be sent.</p>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="example@email.com"
                  className="flex-1 bg-[#121318] border border-[#282a36] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 outline-none"
                />
                <select className="bg-[#121318] border border-[#282a36] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-300">
                  <option value="guest">Guest</option>
                </select>
                <button
                  onClick={handleEmailGuestLink}
                  className="px-4 py-2.5 bg-[#6e56f8] hover:bg-[#5e44f6] text-white rounded-xl text-xs font-bold shadow-md shadow-[#6e56f8]/20 transition-all shrink-0"
                >
                  Send invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

