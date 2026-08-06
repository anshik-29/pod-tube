'use client';

import { useEffect, useState } from 'react';
import { Camera, Mic, Headphones, Volume2 } from 'lucide-react';

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface DeviceSelectorProps {
  onDevicesSelected: (videoDeviceId: string, audioDeviceId: string, name?: string) => void;
  onCancel: () => void;
  initialName?: string;
  isHost?: boolean;
}

export function DeviceSelector({ onDevicesSelected, onCancel, initialName, isHost = true }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [userName, setUserName] = useState<string>(initialName || '');
  const [userRole, setUserRole] = useState<string>(isHost ? 'Host' : 'Guest');
  const [usingHeadphones, setUsingHeadphones] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enumerateDevices();
  }, []);

  const enumerateDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const mediaDevices = deviceList
        .filter((d) => d.kind === 'videoinput' || d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind === 'videoinput' ? 'Camera' : 'Microphone'} ${deviceList.indexOf(d)}`,
          kind: d.kind,
        }));

      setDevices(mediaDevices);

      const firstVideo = mediaDevices.find((d) => d.kind === 'videoinput');
      const firstAudio = mediaDevices.find((d) => d.kind === 'audioinput');
      
      if (firstVideo) setSelectedVideo(firstVideo.deviceId);
      if (firstAudio) setSelectedAudio(firstAudio.deviceId);

      setLoading(false);
    } catch (error) {
      console.error('Error enumerating devices:', error);
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedVideo && selectedAudio) {
      onDevicesSelected(selectedVideo, selectedAudio, userName.trim());
    }
  };

  const videoDevices = devices.filter((d) => d.kind === 'videoinput');
  const audioDevices = devices.filter((d) => d.kind === 'audioinput');

  if (loading) {
    return (
      <div className="bg-[#141519] border border-[#24262d] rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#6e56f8]/30 border-t-[#6e56f8] animate-spin mx-auto" />
        <p className="text-xs font-medium text-slate-400">Loading audio and video devices...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#16161a] border border-[#26262a] rounded-2xl shadow-2xl p-6 max-w-md w-full text-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white tracking-tight">Let&apos;s check your devices</h3>
      </div>
      
      {/* Device Form Controls */}
      <div className="space-y-3">
        {/* Name & Role Field */}
        <div className="flex gap-2">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="flex-1 px-3.5 py-2.5 bg-[#1f1f24] border border-[#2c2c32] rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#6e56f8] placeholder-slate-500"
          />
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="w-24 px-3 py-2.5 bg-[#1f1f24] border border-[#2c2c32] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#6e56f8]"
          >
            <option value="Host">Host</option>
            <option value="Guest">Guest</option>
          </select>
        </div>

        {/* Camera Selector Dropdown */}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Camera className="w-4 h-4" />
          </div>
          <select
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#1f1f24] border border-[#2c2c32] rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:border-[#6e56f8]"
          >
            {videoDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId} className="bg-[#1f1f24] text-slate-200">
                {device.label}
              </option>
            ))}
          </select>
        </div>

        {/* Headphones Selector Dropdown */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <select
              className="w-full pl-10 pr-4 py-2.5 bg-[#1f1f24] border border-[#2c2c32] rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:border-[#6e56f8]"
            >
              <option value="default">Default - Headphones...</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => alert('Headphones test audio active')}
            className="px-4 py-2.5 bg-[#28282e] hover:bg-[#32323a] text-slate-200 border border-[#383842] rounded-xl text-xs font-bold transition-colors"
          >
            Test
          </button>
        </div>

        {/* Microphone Selector Dropdown */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Mic className="w-4 h-4" />
            </div>
            <select
              value={selectedAudio}
              onChange={(e) => setSelectedAudio(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1f1f24] border border-[#2c2c32] rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:border-[#6e56f8]"
            >
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-[#1f1f24] text-slate-200">
                  {device.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => alert('Microphone test active')}
            className="px-4 py-2.5 bg-[#28282e] hover:bg-[#32323a] text-slate-200 border border-[#383842] rounded-xl text-xs font-bold transition-colors"
          >
            Test
          </button>
        </div>

        {/* Headphones Toggle Check */}
        <div className="p-3 rounded-xl bg-[#1f1f24] border border-[#2c2c32] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <Headphones className="w-4 h-4 text-slate-400" />
            <span>Using headphones?</span>
          </div>

          <div className="flex items-center gap-1 bg-[#16161a] p-1 rounded-lg border border-[#2a2a30]">
            <button
              type="button"
              onClick={() => setUsingHeadphones(true)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                usingHeadphones
                  ? 'bg-[#6e56f8] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setUsingHeadphones(false)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                !usingHeadphones
                  ? 'bg-[#6e56f8] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              No
            </button>
          </div>
        </div>
      </div>

      {/* Primary Join Button */}
      <div className="pt-2">
        <button
          onClick={handleConfirm}
          disabled={!selectedVideo || !selectedAudio}
          className="w-full py-3.5 bg-[#6e56f8] hover:bg-[#5e44f6] active:bg-[#4e34e6] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#6e56f8]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Join studio
        </button>
      </div>

      <div className="text-center text-[11px] text-slate-500 pt-1">
        By continuing, you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a>.
      </div>
    </div>
  );
}
