'use client';

import { useEffect, useState } from 'react';

interface BrowserCheckProps {
  onCheckComplete: (isCompatible: boolean) => void;
}

export function BrowserCheck({ onCheckComplete }: BrowserCheckProps) {
  const [checking, setChecking] = useState(true);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    const checkCompatibility = () => {
      const problems: string[] = [];

      // Check for MediaRecorder
      if (!window.MediaRecorder) {
        problems.push('MediaRecorder API is not supported in this browser');
      } else {
        // Check for WebM support
        if (!MediaRecorder.isTypeSupported('video/webm')) {
          problems.push('WebM video format is not supported');
        }
      }

      // Check for getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        problems.push('Camera/microphone access is not available');
      }

      // Check for WebRTC
      if (!window.RTCPeerConnection) {
        problems.push('WebRTC is not supported in this browser');
      }

      // Browser recommendations
      const userAgent = navigator.userAgent.toLowerCase();
      const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
      const isEdge = userAgent.includes('edg');
      const isFirefox = userAgent.includes('firefox');
      const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');

      if (!isChrome && !isEdge && !isFirefox && !isSafari) {
        problems.push('Unsupported browser detected. Please use Chrome, Edge, Firefox, or Safari');
      }

      setIssues(problems);
      setChecking(false);
      onCheckComplete(problems.length === 0);
    };

    checkCompatibility();
  }, [onCheckComplete]);

  if (checking) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-blue-800 text-sm">Checking browser compatibility...</p>
      </div>
    );
  }

  if (issues.length > 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <h3 className="text-red-900 font-semibold mb-2">Browser Compatibility Issues</h3>
        <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
          {issues.map((issue, index) => (
            <li key={index}>{issue}</li>
          ))}
        </ul>
        <p className="text-sm text-red-700 mt-3">
          <strong>Recommended browsers:</strong> Chrome, Edge, Firefox, or Safari (latest versions)
        </p>
      </div>
    );
  }

  return null;
}
