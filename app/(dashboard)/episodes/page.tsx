'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import {
  Film,
  Download,
  Trash2,
  Search,
  Plus,
  Sparkles,
  MoreHorizontal,
  Clock,
  Zap,
  Filter,
  CheckSquare,
  Square,
  Play
} from 'lucide-react';

interface Episode {
  id: string;
  session_id: string;
  title: string | null;
  state: string;
  file_references: Record<string, string> | null;
  created_at: string;
}

export default function EpisodesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'recordings' | 'made_for_you' | 'edits' | 'exports'>('recordings');

  const fetchEpisodes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (stateFilter !== 'all') {
        params.append('state', stateFilter);
      }

      const url = `/api/episodes${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch episodes');
      }

      const data = await response.json();
      setEpisodes(data.episodes);
    } catch (error) {
      console.error('Error fetching episodes:', error);
      showToast('Failed to load episodes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchEpisodes();
    setSelectedEpisodes(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchQuery, stateFilter]);

  const handleDownload = async (episodeId: string, type: 'video' | 'audio') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/episodes/${episodeId}/download?type=${type}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `episode.${type === 'video' ? 'mp4' : 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Download started', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download file', 'error');
    }
  };

  const handleDelete = async (episodeId: string) => {
    if (deletingEpisodeId === episodeId) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/episodes/${episodeId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Delete failed');
        }

        showToast('Episode deleted successfully', 'success');
        setDeletingEpisodeId(null);
        setSelectedEpisodes((prev) => {
          const next = new Set(prev);
          next.delete(episodeId);
          return next;
        });
        fetchEpisodes();
      } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete episode', 'error');
        setDeletingEpisodeId(null);
      }
    } else {
      setDeletingEpisodeId(episodeId);
    }
  };

  const handleToggleSelect = (episodeId: string) => {
    setSelectedEpisodes((prev) => {
      const next = new Set(prev);
      if (next.has(episodeId)) {
        next.delete(episodeId);
      } else {
        next.add(episodeId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedEpisodes.size === episodes.length) {
      setSelectedEpisodes(new Set());
    } else {
      setSelectedEpisodes(new Set(episodes.map((e) => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEpisodes.size === 0) return;

    if (!bulkDeleting) {
      setBulkDeleting(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const episodeIds = Array.from(selectedEpisodes);
      
      const deletePromises = episodeIds.map((id) =>
        fetch(`/api/episodes/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      
      if (failed.length > 0) {
        showToast(`Failed to delete ${failed.length} episode(s)`, 'error');
      } else {
        showToast(`Successfully deleted ${episodeIds.length} episode(s)`, 'success');
      }

      setSelectedEpisodes(new Set());
      setBulkDeleting(false);
      fetchEpisodes();
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast('Failed to delete episodes', 'error');
      setBulkDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-[#6e56f8] selection:text-white">
      {/* ─── Top Navigation Header (Exact Riverside Structure) ─── */}
      <header className="px-6 pt-5 pb-3 border-b border-[#222228] bg-[#121212] sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-slate-400">Projects</span>
            <span className="text-slate-600 font-bold">›</span>
            <h1 className="text-lg font-bold text-white tracking-tight truncate">All Recordings</h1>
          </div>

        </div>

        {/* Sub-navigation Tabs */}
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

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Search & Filter Bar */}
        <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recordings by title..."
              className="w-full bg-[#121215] border border-[#282830] text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-[#6e56f8]"
            />
          </div>

          <div className="relative flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full bg-[#121215] border border-[#282830] text-slate-200 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-[#6e56f8]"
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedEpisodes.size > 0 && (
          <div className="bg-[#6e56f8]/10 border border-[#6e56f8]/30 rounded-2xl p-4 flex items-center justify-between text-xs">
            <span className="font-bold text-white">
              {selectedEpisodes.size} recording{selectedEpisodes.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              {!bulkDeleting ? (
                <>
                  <button
                    onClick={() => setSelectedEpisodes(new Set())}
                    className="px-3.5 py-1.5 bg-[#22222a] text-slate-300 rounded-xl font-bold"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md"
                  >
                    Delete Selected
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-red-300 font-bold">Confirm deletion?</span>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setBulkDeleting(false)}
                    className="px-3 py-1 bg-[#22222a] text-slate-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Select All Checkbox bar */}
        {episodes.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <button
              onClick={handleSelectAll}
              className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-2"
            >
              {selectedEpisodes.size === episodes.length && episodes.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#6e56f8]" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>Select All Recordings</span>
            </button>
          </div>
        )}

        {/* Recordings Grid / List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-3">
            <div className="w-5 h-5 border-2 border-[#6e56f8]/30 border-t-[#6e56f8] rounded-full animate-spin" />
            <span>Loading recordings...</span>
          </div>
        ) : episodes.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-12 text-center space-y-4">
            <Film className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No recordings found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first recording session to start building your studio episodes library.
            </p>
            <Link
              href="/sessions/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6e56f8] hover:bg-[#5e44f6] text-white font-bold text-xs rounded-xl shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Recording</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {episodes.map((ep) => {
              const epTitle = ep.title || `Episode ${ep.id.slice(0, 8)}`;
              const isSelected = selectedEpisodes.has(ep.id);

              return (
                <div
                  key={ep.id}
                  className={`bg-[#1a1a1a] border ${
                    isSelected ? 'border-[#6e56f8] bg-[#1f1d2b]' : 'border-[#282828] hover:border-[#383842]'
                  } rounded-2xl overflow-hidden transition-all flex flex-col justify-between group shadow-xl`}
                >
                  {/* Card Thumbnail / Preview Placeholder */}
                  <div className="relative aspect-video bg-[#141418] flex items-center justify-center border-b border-[#24242a]">
                    <Film className="w-10 h-10 text-slate-700 group-hover:text-slate-500 transition-colors" />
                    
                    <button
                      onClick={() => handleToggleSelect(ep.id)}
                      className="absolute top-3 left-3 p-1 rounded-lg bg-black/60 backdrop-blur-md text-white border border-white/10"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#6e56f8]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <span
                      className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        ep.state === 'ready'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : ep.state === 'processing'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {ep.state.toUpperCase()}
                    </span>

                    <Link
                      href={`/episodes/${ep.id}`}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-xs transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#6e56f8] text-white flex items-center justify-center shadow-2xl">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </Link>
                  </div>

                  {/* Card Info & Actions */}
                  <div className="p-4 space-y-3">
                    <div>
                      <Link href={`/episodes/${ep.id}`} className="text-sm font-bold text-white hover:text-[#6e56f8] transition-colors truncate block">
                        {epTitle}
                      </Link>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Recorded on {new Date(ep.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#24242a] text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDownload(ep.id, 'video')}
                          disabled={ep.state !== 'ready'}
                          className="px-2.5 py-1.5 bg-[#24242a] hover:bg-[#2e2e36] text-slate-200 rounded-lg font-bold border border-[#30303a] disabled:opacity-40 flex items-center gap-1"
                          title="Download MP4"
                        >
                          <Download className="w-3.5 h-3.5 text-[#6e56f8]" />
                          <span>MP4</span>
                        </button>
                        <button
                          onClick={() => handleDownload(ep.id, 'audio')}
                          disabled={ep.state !== 'ready'}
                          className="px-2.5 py-1.5 bg-[#24242a] hover:bg-[#2e2e36] text-slate-200 rounded-lg font-bold border border-[#30303a] disabled:opacity-40 flex items-center gap-1"
                          title="Download MP3"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>MP3</span>
                        </button>
                      </div>

                      {deletingEpisodeId === ep.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(ep.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingEpisodeId(null)}
                            className="px-2 py-1 bg-[#24242a] text-slate-300 rounded text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(ep.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Delete episode"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
