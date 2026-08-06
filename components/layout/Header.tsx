'use client';

import { Search, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

export function Header() {
  return (
    <header className="h-14 border-b border-[#282828] bg-[#121212] px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      <div className="w-20 hidden sm:block"></div>

      {/* Centered Q Search input (Exact Riverside Top Bar) */}
      <div className="relative w-full max-w-lg mx-auto">
        <Search className="w-4 h-4 text-[#888888] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search"
          className="w-full bg-[#1c1c1c] border border-[#282828] rounded-xl pl-10 pr-4 py-1.5 text-xs text-white placeholder-[#888888] focus:outline-none focus:border-[#444444]"
        />
      </div>

      {/* Right Chevron Controls */}
      <div className="flex items-center gap-1 text-[#888888]">
        <button className="p-1 hover:text-white">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button className="p-1 hover:text-white">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
