'use client';

import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      <div className="hidden"><Navbar /></div>
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Help & Documentation</h1>
        <p className="text-sm text-zinc-400">
          Get answers to common questions and learn how to use PodNow effectively.
        </p>
      </div>

      {/* Quick Start Guide */}
      <section className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#6e56f8]/10 text-[#6e56f8] inline-flex items-center justify-center text-sm">1</span>
          <span>Quick Start Guide</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-[#121212] border border-[#282828] rounded-xl space-y-1">
            <h3 className="text-sm font-semibold text-white">1. Create a Session</h3>
            <p className="text-xs text-zinc-400">
              Click &quot;New Session&quot; to create a recording session. You&apos;ll get a unique link to share with guests.
            </p>
          </div>
          <div className="p-4 bg-[#121212] border border-[#282828] rounded-xl space-y-1">
            <h3 className="text-sm font-semibold text-white">2. Start Recording</h3>
            <p className="text-xs text-zinc-400">
              Once in the recording room, click &quot;Start Recording&quot; to begin. The timer will show how long you&apos;ve been recording.
            </p>
          </div>
          <div className="p-4 bg-[#121212] border border-[#282828] rounded-xl space-y-1">
            <h3 className="text-sm font-semibold text-white">3. Invite Guests</h3>
            <p className="text-xs text-zinc-400">
              Share the guest link with participants. They can join at any time, even after recording has started.
            </p>
          </div>
          <div className="p-4 bg-[#121212] border border-[#282828] rounded-xl space-y-1">
            <h3 className="text-sm font-semibold text-white">4. Stop & Process</h3>
            <p className="text-xs text-zinc-400">
              Click &quot;Stop Recording&quot; when finished. Your recording will be uploaded and processed automatically.
            </p>
          </div>
          <div className="p-4 bg-[#121212] border border-[#282828] rounded-xl space-y-1 col-span-1 md:col-span-2">
            <h3 className="text-sm font-semibold text-white">5. Download</h3>
            <p className="text-xs text-zinc-400">
              Once processing is complete, download your episode as MP4 (video) or MP3 (audio) from the Episodes page.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 space-y-5 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-[#6e56f8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Frequently Asked Questions</span>
        </h2>
        <div className="space-y-4">
          <div className="border-b border-[#282828] pb-4">
            <h3 className="text-sm font-semibold text-white mb-1">What browsers are supported?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              PodNow works best with modern browsers like Chrome, Firefox, Edge, or Safari. The app will check your browser compatibility when you start a recording session.
            </p>
          </div>
          <div className="border-b border-[#282828] pb-4">
            <h3 className="text-sm font-semibold text-white mb-1">Can I record without a guest?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Yes! You can start recording solo. The guest link is optional - you can use it later if someone wants to join.
            </p>
          </div>
          <div className="border-b border-[#282828] pb-4">
            <h3 className="text-sm font-semibold text-white mb-1">How long does processing take?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Processing time depends on the length of your recording. Typically, a 30-minute recording takes 2-5 minutes to process. You can see the progress percentage on the episode detail page.
            </p>
          </div>
          <div className="border-b border-[#282828] pb-4">
            <h3 className="text-sm font-semibold text-white mb-1">Can I edit my recordings?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Yes! You can trim the start and end of your recordings, add descriptions, and edit episode titles from the episode detail page.
            </p>
          </div>
          <div className="border-b border-[#282828] pb-4">
            <h3 className="text-sm font-semibold text-white mb-1">What if my recording fails?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              If processing fails, you&apos;ll see an error message. You can try recording again. Make sure you have a stable internet connection and sufficient storage space.
            </p>
          </div>
          <div className="border-b border-[#282828] pb-4">
            <h3 className="text-sm font-semibold text-white mb-1">Can I delete multiple episodes at once?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Yes! On the Episodes page, you can select multiple episodes using the checkboxes and use the &quot;Delete Selected&quot; button to remove them in bulk.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">How do I change my email or password?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Go to Settings (gear icon in the navbar) to update your email address or change your password. After changing your email, you&apos;ll need to log in again.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-xl font-bold text-white">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#121212] border-l-4 border-blue-500 rounded-r-xl">
            <h3 className="text-sm font-semibold text-white mb-1">Real-time Recording</h3>
            <p className="text-xs text-zinc-400">Record high-quality video and audio directly in your browser</p>
          </div>
          <div className="p-4 bg-[#121212] border-l-4 border-emerald-500 rounded-r-xl">
            <h3 className="text-sm font-semibold text-white mb-1">Guest Invitations</h3>
            <p className="text-xs text-zinc-400">Share a link to invite guests to join your recording</p>
          </div>
          <div className="p-4 bg-[#121212] border-l-4 border-purple-500 rounded-r-xl">
            <h3 className="text-sm font-semibold text-white mb-1">Automatic Processing</h3>
            <p className="text-xs text-zinc-400">Recordings are automatically processed and ready to download</p>
          </div>
          <div className="p-4 bg-[#121212] border-l-4 border-amber-500 rounded-r-xl">
            <h3 className="text-sm font-semibold text-white mb-1">Trimming & Editing</h3>
            <p className="text-xs text-zinc-400">Trim start/end points and add descriptions to your episodes</p>
          </div>
          <div className="p-4 bg-[#121212] border-l-4 border-red-500 rounded-r-xl">
            <h3 className="text-sm font-semibold text-white mb-1">Multiple Formats</h3>
            <p className="text-xs text-zinc-400">Download as MP4 (video) or MP3 (audio-only)</p>
          </div>
          <div className="p-4 bg-[#121212] border-l-4 border-indigo-500 rounded-r-xl">
            <h3 className="text-sm font-semibold text-white mb-1">Search & Filter</h3>
            <p className="text-xs text-zinc-400">Easily find episodes by title or filter by status</p>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="bg-[#6e56f8]/10 border border-[#6e56f8]/30 rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-[#6e56f8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Tips for Best Results</span>
        </h2>
        <ul className="space-y-2 text-xs text-zinc-300">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6e56f8]"></span>
            <span>Use a good quality microphone and webcam for better audio/video quality</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6e56f8]"></span>
            <span>Ensure you have a stable internet connection before starting</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6e56f8]"></span>
            <span>Close unnecessary applications to improve performance</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6e56f8]"></span>
            <span>Test your microphone and camera before recording</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6e56f8]"></span>
            <span>Use headphones to prevent audio feedback</span>
          </li>
        </ul>
      </section>

      {/* Support Section */}
      <section className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Need More Help?</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          If you&apos;re experiencing issues or have questions not covered here, please check the browser console for error messages and ensure your browser is up to date.
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-4 py-2.5 bg-[#6e56f8] hover:bg-[#5b45e0] text-white rounded-xl text-xs font-medium transition-colors shadow-lg shadow-[#6e56f8]/20"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 bg-[#121212] hover:bg-zinc-800 border border-[#282828] text-zinc-200 rounded-xl text-xs font-medium transition-colors"
          >
            Start Recording
          </Link>
        </div>
      </section>
    </div>
  );
}
