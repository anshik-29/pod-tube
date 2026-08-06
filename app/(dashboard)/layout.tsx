'use client';

import { AuthProvider } from '@/components/providers/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ToastProvider } from '@/components/ui/Toast';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <ToastProvider>
          <div className="flex min-h-screen bg-[#121212] text-white antialiased font-sans">
            {/* Left Vertical Rail */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#121212]">
              <Header />
              <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#121212]">
                {children}
              </main>
            </div>
          </div>
        </ToastProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
}
