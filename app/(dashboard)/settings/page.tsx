'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'account' | 'password'>('account');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Email cannot be empty', 'error');
      return;
    }

    if (email === user?.email) {
      showToast('Email is unchanged', 'info');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update email');
      }

      showToast('Email updated successfully. Please log in again.', 'success');
      setEmail(user?.email || '');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error: any) {
      console.error('Update email error:', error);
      showToast(error.message || 'Failed to update email', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('All password fields are required', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      showToast('Password updated successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Update password error:', error);
      showToast(error.message || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Account Settings</h1>
        <p className="text-sm text-zinc-400">
          Manage your PodNow account credentials and profile parameters.
        </p>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-[#282828] flex space-x-6">
        <button
          onClick={() => setActiveTab('account')}
          className={`py-3 font-semibold text-sm transition-all relative ${
            activeTab === 'account'
              ? 'text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Account Information
          {activeTab === 'account' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6e56f8] rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`py-3 font-semibold text-sm transition-all relative ${
            activeTab === 'password'
              ? 'text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Change Password
          {activeTab === 'password' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6e56f8] rounded-full"></span>
          )}
        </button>
      </div>

      {/* Account Information Tab */}
      {activeTab === 'account' && (
        <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Update Email Address</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Your primary email address used for studio login and session notifications.
            </p>
          </div>
          <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-[#121212] border border-[#282828] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#6e56f8] transition-colors text-sm"
                placeholder="your@email.com"
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                Note: Updating your email address will require re-authentication.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || email === user?.email}
              className="px-6 py-2.5 bg-[#6e56f8] hover:bg-[#5b45e0] text-white rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#6e56f8]/20"
            >
              {loading ? 'Updating...' : 'Save Email Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Change Security Password</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Ensure your account is using a strong password of at least 8 characters.
            </p>
          </div>
          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="currentPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-[#121212] border border-[#282828] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#6e56f8] transition-colors text-sm"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-[#121212] border border-[#282828] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#6e56f8] transition-colors text-sm"
                placeholder="Enter new password (min 8 chars)"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-[#121212] border border-[#282828] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#6e56f8] transition-colors text-sm"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#6e56f8] hover:bg-[#5b45e0] text-white rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#6e56f8]/20"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

