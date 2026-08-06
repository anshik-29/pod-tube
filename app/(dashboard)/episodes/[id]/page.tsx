'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { 
  Download, 
  Film, 
  Music, 
  Scissors, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Plus, 
  Sparkles, 
  MoreHorizontal, 
  Zap, 
  RotateCw,
  Clock,
  Sliders
} from 'lucide-react';

interface Episode {
  id: string;
  session_id: string;
  title: string | null;
  description: string | null;
  state: string;
  file_references: Record<string, string> | null;
  trim_settings: { trimStart?: number; trimEnd?: number; quality?: 'low' | 'medium' | 'high' } | null;
  created_at: string;
}

export default function EpisodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const episodeId = params.id as string;
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [processing, setProcessing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [processingJob, setProcessingJob] = useState<{ status: string; progress: number | null } | null>(null);
  const [activeTab, setActiveTab] = useState<'recordings' | 'made_for_you' | 'edits' | 'exports'>('recordings');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Load trim settings from episode when it's fetched
  useEffect(() => {
    if (episode?.trim_settings) {
      setTrimStart(episode.trim_settings.trimStart || 0);
      setTrimEnd(episode.trim_settings.trimEnd || 0);
      setQuality(episode.trim_settings.quality || 'medium');
    }
    if (episode?.title !== undefined) {
      setEditedTitle(episode.title || '');
    }
    if (episode?.description !== undefined) {
      setEditedDescription(episode.description || '');
    }
  }, [episode]);

  useEffect(() => {
    if (!user) return;

    const fetchEpisode = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/episodes/${episodeId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          router.push('/episodes');
          return;
        }

        const data = await response.json();
        setEpisode(data.episode);
        setProcessingJob(data.processingJob || null);

        // Load video preview URL if episode is ready
        if (data.episode.state === 'ready' && data.episode.file_references?.video) {
          try {
            const previewResponse = await fetch(`/api/episodes/${episodeId}/preview?type=video`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (previewResponse.ok) {
              const blob = await previewResponse.blob();
              const url = window.URL.createObjectURL(blob);
              setVideoUrl(url);
            }
          } catch (error) {
            console.error('Error loading video preview:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching episode:', error);
        router.push('/episodes');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisode();
  }, [episodeId, user, router]);

  // Poll for processing status updates
  useEffect(() => {
    if (!user || !episode || episode.state !== 'processing') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/episodes/${episodeId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setEpisode(data.episode);
          setProcessingJob(data.processingJob || null);
          
          if (data.episode.state !== 'processing') {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling episode status:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [episodeId, user, episode]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        window.URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/episodes/${episodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trimStart,
          trimEnd,
          quality,
        }),
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const updatedEpisode = await fetch(`/api/episodes/${episodeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(r => r.json());
      setEpisode(updatedEpisode.episode);
      showToast('Processing started', 'success');
    } catch (error) {
      console.error('Processing error:', error);
      showToast('Failed to start processing', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveTitle = async () => {
    setSavingTitle(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/episodes/${episodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: editedTitle || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }

      const data = await response.json();
      setEpisode(data.episode);
      setIsEditingTitle(false);
      showToast('Title updated successfully', 'success');
    } catch (error) {
      console.error('Update title error:', error);
      showToast('Failed to update title', 'error');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSaveDescription = async () => {
    setSavingDescription(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/episodes/${episodeId}/description`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description: editedDescription || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to update description');
      }

      const data = await response.json();
      setEpisode(data.episode);
      setIsEditingDescription(false);
      showToast('Description updated successfully', 'success');
    } catch (error) {
      console.error('Update description error:', error);
      showToast('Failed to update description', 'error');
    } finally {
      setSavingDescription(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/episodes/${episodeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete episode');
      }

      showToast('Episode deleted successfully', 'success');
      router.push('/episodes');
    } catch (error) {
      console.error('Delete episode error:', error);
      showToast('Failed to delete episode', 'error');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownload = async (type: 'video' | 'audio') => {
    setDownloadingFormat(type);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/episodes/${episodeId}/download?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `episode.${type === 'video' ? 'mp4' : 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(`Started downloading ${type.toUpperCase()}`, 'success');
    } catch (error) {
      showToast(`Failed to download ${type}`, 'error');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <div className="w-5 h-5 rounded-full border-2 border-[#6e56f8]/30 border-t-[#6e56f8] animate-spin" />
          <span>Loading project details...</span>
        </div>
      </div>
    );
  }

  if (!episode) return null;

  const displayTitle = episode.title || `Episode ${episode.id.slice(0, 8)}`;

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-[#6e56f8] selection:text-white">
      {/* ─── Top Navigation Header (Exact Riverside Structure) ─── */}
      <header className="px-6 pt-5 pb-3 border-b border-[#222228] bg-[#121212] sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4">
          {/* Breadcrumbs & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/episodes" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              Projects
            </Link>
            <span className="text-slate-600 font-bold">›</span>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="bg-[#1a1a1e] border border-[#32323a] text-white font-bold text-lg px-3 py-1 rounded-xl outline-none focus:border-[#6e56f8]"
                  autoFocus
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') await handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                />
                <button onClick={handleSaveTitle} disabled={savingTitle} className="p-2 bg-[#6e56f8] hover:bg-[#5e44f6] text-white rounded-lg">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingTitle(false)} className="p-2 bg-[#22222a] text-slate-300 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-lg font-bold text-white tracking-tight truncate">{displayTitle}</h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity"
                  title="Rename"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Sub-navigation Tabs (Recordings, Made for You, Edits, Exports) */}
        <div className="flex items-center gap-6 mt-4 border-b border-[#222228] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('recordings')}
            className={`pb-2.5 relative transition-colors ${
              activeTab === 'recordings' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Recordings</span>
            {activeTab === 'recordings' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"></span>}
          </button>
          <button
            onClick={() => setActiveTab('made_for_you')}
            className={`pb-2.5 relative transition-colors ${
              activeTab === 'made_for_you' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Made for You</span>
          </button>
          <button
            onClick={() => setActiveTab('edits')}
            className={`pb-2.5 relative transition-colors ${
              activeTab === 'edits' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Edits</span>
          </button>
          <button
            onClick={() => setActiveTab('exports')}
            className={`pb-2.5 relative transition-colors ${
              activeTab === 'exports' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Exports</span>
          </button>
        </div>
      </header>

      {/* ─── Main Content Body ─── */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Processing Banner Alert */}
        {episode.state === 'processing' && (
          <div className="bg-[#1a1812] border border-amber-500/30 rounded-2xl p-5 text-amber-200 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">Processing Recording Assembly...</h4>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Concatenating participant tracks into high quality output.
                  </p>
                </div>
              </div>
              <button
                onClick={handleProcess}
                className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>

            {processingJob?.progress !== null && processingJob?.progress !== undefined && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-mono text-amber-300">
                  <span>Assembling media</span>
                  <span>{processingJob.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#2a261a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                    style={{ width: `${processingJob.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── Left Column (2/3 width): Large Video Player Box ─── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl overflow-hidden shadow-2xl relative group">
              {episode.state === 'ready' && videoUrl ? (
                <div className="relative aspect-video bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    controls
                    controlsList="nodownload"
                    className="w-full h-full object-contain"
                    src={videoUrl}
                    onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  />
                  {/* Duration Badge overlay (Bottom-right - Exact Riverside layout) */}
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[11px] font-mono font-bold text-white border border-white/10 pointer-events-none">
                    {formatTime(videoDuration)}
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-[#141418] flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Film className="w-12 h-12 stroke-[1.5] text-slate-600" />
                  <span className="text-xs font-medium">
                    {episode.state === 'processing' ? 'Assembling video preview...' : 'No video preview available'}
                  </span>
                </div>
              )}
            </div>

            {/* Episode Title & Description Card */}
            <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Information</h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(episode.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </div>

              {isEditingDescription ? (
                <div className="space-y-3">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-[#121215] border border-[#2a2a32] rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-[#6e56f8]"
                    placeholder="Add description or notes..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDescription}
                      disabled={savingDescription}
                      className="px-3.5 py-1.5 bg-[#6e56f8] hover:bg-[#5e44f6] text-white rounded-xl text-xs font-bold shadow-md"
                    >
                      {savingDescription ? 'Saving...' : 'Save Notes'}
                    </button>
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-3.5 py-1.5 bg-[#24242a] text-slate-300 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group relative pt-1">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {episode.description || 'No description or notes added for this recording session.'}
                  </p>
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="mt-2 text-xs font-bold text-[#6e56f8] hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{episode.description ? 'Edit notes' : 'Add notes'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ─── Right Column (1/3 width): Downloads, Trimming & Export Settings ─── */}
          <div className="space-y-6">

            {/* Download Options Panel (Redesigned with Premium Dark Buttons) */}
            <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Download className="w-4 h-4 text-[#6e56f8]" />
                <h3 className="text-sm font-bold tracking-tight">Download Assets</h3>
              </div>

              <div className="space-y-2.5">
                {/* Full Merged Video Button */}
                <button
                  onClick={() => handleDownload('video')}
                  disabled={episode.state !== 'ready' || downloadingFormat === 'video'}
                  className="w-full p-3.5 bg-[#141418] hover:bg-[#1f1f26] border border-[#282830] hover:border-[#6e56f8]/50 rounded-xl flex items-center justify-between text-left transition-all group disabled:opacity-40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#6e56f8]/10 border border-[#6e56f8]/20 text-[#6e56f8] flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-[#6e56f8] transition-colors">
                        Full Video Recording
                      </div>
                      <div className="text-[11px] text-slate-400">MP4 • Combined Tracks</div>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-[#6e56f8] hover:bg-[#5e44f6] text-white font-bold text-xs rounded-lg shadow-md shrink-0 flex items-center gap-1">
                    {downloadingFormat === 'video' ? '...' : <Download className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* Full Merged Audio Button */}
                <button
                  onClick={() => handleDownload('audio')}
                  disabled={episode.state !== 'ready' || downloadingFormat === 'audio'}
                  className="w-full p-3.5 bg-[#141418] hover:bg-[#1f1f26] border border-[#282830] hover:border-emerald-500/50 rounded-xl flex items-center justify-between text-left transition-all group disabled:opacity-40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Music className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        High Quality Audio
                      </div>
                      <div className="text-[11px] text-slate-400">MP3 • Separate Audio</div>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-[#282832] group-hover:bg-[#323240] text-slate-200 font-bold text-xs rounded-lg border border-[#383844] shrink-0 flex items-center gap-1">
                    {downloadingFormat === 'audio' ? '...' : <Download className="w-3.5 h-3.5" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Trimming & Quality Processing Controls */}
            <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Scissors className="w-4 h-4 text-[#6e56f8]" />
                <h3 className="text-sm font-bold tracking-tight">Trim & Re-export</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Start Cut (sec)</label>
                  <input
                    type="number"
                    value={trimStart}
                    onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className="w-full bg-[#121215] border border-[#28282e] rounded-xl px-3 py-2 text-white outline-none focus:border-[#6e56f8]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">End Cut (sec)</label>
                  <input
                    type="number"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className="w-full bg-[#121215] border border-[#28282e] rounded-xl px-3 py-2 text-white outline-none focus:border-[#6e56f8]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Quality Profile</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full bg-[#121215] border border-[#28282e] rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-[#6e56f8]"
                  >
                    <option value="low">Low (Fast processing)</option>
                    <option value="medium">Medium (Recommended)</option>
                    <option value="high">High (Best Quality)</option>
                  </select>
                </div>

                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full py-3 bg-[#6e56f8] hover:bg-[#5e44f6] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Sliders className="w-4 h-4" />
                  <span>{processing ? 'Processing...' : 'Apply & Re-export'}</span>
                </button>
              </div>
            </div>

            {/* Danger Zone: Delete Episode */}
            <div className="bg-[#181214] border border-red-500/20 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Danger Zone</h4>
              <p className="text-[11px] text-slate-400">Permanently delete this project recording.</p>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Recording</span>
                </button>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="text-xs text-red-300 font-bold">Are you sure?</div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-2 bg-[#222228] text-slate-300 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
