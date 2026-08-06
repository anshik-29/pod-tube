'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Folder, 
  Calendar, 
  Radio, 
  Mail, 
  Globe, 
  UserPlus, 
  Video, 
  Wand2, 
  HelpCircle 
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Projects', href: '/episodes', icon: Folder },
  ];

  return (
    <aside className="w-16 bg-black border-r border-[#282828] flex flex-col items-center justify-between py-4 h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Top Icon */}
        <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#282828] flex items-center justify-center text-slate-300">
          <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-4 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '#' && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full flex flex-col items-center gap-1 py-1.5 transition-colors ${
                  isActive ? 'text-white font-bold' : 'text-[#888888] hover:text-white'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-[#1a1a1a] text-white' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

    </aside>
  );
}
