'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-[#121212] border-b border-[#282828] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#6e56f8] flex items-center justify-center text-white text-xs font-black">
                P
              </div>
              <span>PodNow Studio</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/episodes"
              className="text-xs sm:text-sm text-zinc-400 hover:text-white font-medium transition-colors"
            >
              Recordings
            </Link>
            <Link
              href="/sessions"
              className="text-xs sm:text-sm text-zinc-400 hover:text-white font-medium transition-colors"
            >
              Sessions
            </Link>
            <Link
              href="/help"
              className="text-xs sm:text-sm text-zinc-400 hover:text-white font-medium transition-colors p-1.5"
              title="Help & Documentation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
            <Link
              href="/settings"
              className="text-xs sm:text-sm text-zinc-400 hover:text-white font-medium transition-colors p-1.5"
              title="Account Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <span className="text-xs text-zinc-400 font-medium hidden sm:inline">{user?.email}</span>
            <button
              onClick={logout}
              className="text-xs text-zinc-300 hover:text-white font-medium px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#282828] border border-[#282828] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

