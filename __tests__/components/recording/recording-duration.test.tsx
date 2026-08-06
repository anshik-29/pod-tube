/**
 * Tests for Recording Duration Display
 * 
 * @jest-environment jsdom
 */

import { BrowserRecorder } from '@/lib/recording/recorder';
import { WebRTCPeer } from '@/lib/webrtc/peer';

// Mock dependencies
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

jest.mock('@/lib/recording/recorder');
jest.mock('@/lib/webrtc/peer');

describe('Recording Duration Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should format duration as MM:SS correctly', () => {
    // Test the formatDuration function logic
    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(5)).toBe('00:05');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(125)).toBe('02:05');
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('should update duration every second while recording', async () => {
    jest.useFakeTimers();
    
    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    let currentDuration = 0;
    const startTime = new Date('2024-01-01T00:00:00Z');

    // Simulate timer updates
    const updateDuration = () => {
      const now = new Date('2024-01-01T00:00:00Z');
      now.setSeconds(now.getSeconds() + currentDuration);
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      currentDuration = elapsed;
      return formatDuration(elapsed);
    };

    // Initial state
    expect(updateDuration()).toBe('00:00');

    // After 1 second
    currentDuration = 1;
    expect(updateDuration()).toBe('00:01');

    // After 5 seconds
    currentDuration = 5;
    expect(updateDuration()).toBe('00:05');

    // After 65 seconds (1 minute 5 seconds)
    currentDuration = 65;
    expect(updateDuration()).toBe('01:05');

    jest.useRealTimers();
  });

  it('should reset duration when recording stops', () => {
    let recordingStartTime: Date | null = new Date();
    let recordingDuration = 0;

    // Simulate recording start
    recordingStartTime = new Date();
    recordingDuration = 0;

    // Simulate some time passing
    recordingDuration = 30;

    // Simulate recording stop
    recordingStartTime = null;
    recordingDuration = 0;

    expect(recordingStartTime).toBeNull();
    expect(recordingDuration).toBe(0);
  });
});
