'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  Scissors, 
  Calendar, 
  Users, 
  Folder, 
  MoreHorizontal, 
  Plus,
  Film,
  Play
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

interface Episode {
  id: string;
  session_id: string;
  title: string | null;
  state: string;
  file_references: Record<string, string> | null;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const episodeRes = await fetch('/api/episodes', { headers });
        if (episodeRes.ok) {
          const episodeData = await episodeRes.json();
          setEpisodes(episodeData.episodes || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'My Studio');

  return (
    <div className="space-y-8 max-w-7xl mx-auto bg-[#121212] min-h-screen p-2 text-white font-sans">
      {/* Top Quick Action Buttons Row (Record & Upload) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        {/* Button 1: Record */}
        <Link
          href="/sessions/new"
          className="p-4 rounded-xl bg-[#1a1a1a] border border-[#282828] hover:bg-[#242424] transition-colors flex items-center gap-3.5 group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#282828] flex items-center justify-center shrink-0">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-red-500 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Record</div>
            <div className="text-xs text-[#aaaaaa]">Start a new recording</div>
          </div>
        </Link>

        {/* Button 2: Upload */}
        <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#282828] hover:bg-[#242424] transition-colors flex items-center gap-3.5 cursor-pointer group">
          <div className="w-9 h-9 rounded-lg bg-[#282828] flex items-center justify-center shrink-0 text-slate-300">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Upload</div>
            <div className="text-xs text-[#aaaaaa]">Start with a file</div>
          </div>
        </div>
      </div>

      {/* Dynamic Recents Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight">Recents</h2>
          {episodes.length > 0 && (
            <Link href="/episodes" className="text-xs font-bold text-[#6e56f8] hover:underline">
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-12 text-xs text-slate-400">
            <div className="w-4 h-4 rounded-full border-2 border-[#6e56f8]/30 border-t-[#6e56f8] animate-spin" />
            <span>Loading recent recordings...</span>
          </div>
        ) : episodes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {episodes.slice(0, 6).map((ep) => {
              const epTitle = ep.title || `Episode ${ep.id.slice(0, 8)}`;

              return (
                <div key={ep.id} className="group flex flex-col space-y-2">
                  {/* Dynamic Video Card Preview Thumbnail */}
                  <Link
                    href={`/episodes/${ep.id}`}
                    className="aspect-video bg-[#141418] rounded-xl border border-[#282828] group-hover:border-[#6e56f8]/50 relative overflow-hidden flex items-center justify-center transition-colors"
                  >
                    <Film className="w-10 h-10 text-slate-700 group-hover:text-slate-500 transition-colors" />

                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-[#6e56f8] text-white flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>

                    <span
                      className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        ep.state === 'ready'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : ep.state === 'processing'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {ep.state.toUpperCase()}
                    </span>
                  </Link>

                  {/* Metadata Row */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <Link
                        href={`/episodes/${ep.id}`}
                        className="text-sm font-bold text-white hover:text-[#6e56f8] transition-colors truncate block max-w-[220px]"
                      >
                        {epTitle}
                      </Link>
                      <div className="text-xs text-[#aaaaaa]">
                        Recorded {new Date(ep.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#aaaaaa]">
                        <Folder className="w-3.5 h-3.5 text-[#666666]" />
                        <span>{userName}</span>
                      </div>
                    </div>

                    <Link href={`/episodes/${ep.id}`} className="p-1 text-[#aaaaaa] hover:text-white">
                      <MoreHorizontal className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-8 text-center space-y-3">
            <Film className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No recent recordings</h3>
            <p className="text-xs text-[#aaaaaa] max-w-sm mx-auto">
              Start a new studio session to record high quality video & audio tracks.
            </p>
            <Link
              href="/sessions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6e56f8] hover:bg-[#5e44f6] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start Recording</span>
            </Link>
          </div>
        )}
      </div>

      {/* Analytics Section */}
      <div className="pt-4 space-y-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Analytics</h2>
        <div className="p-6 rounded-xl bg-[#1a1a1a] border border-[#282828] text-sm text-[#aaaaaa]">
          Analytics dashboard overview...
        </div>
      </div>
    </div>
  );
}
