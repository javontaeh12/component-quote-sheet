'use client';

import { LowStockNotification } from './LowStockNotification';
import { useAuth } from './AuthProvider';

export function AdminHeader() {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-14 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 lg:px-8">
      {/* Spacer for mobile hamburger button */}
      <div className="w-10 lg:hidden" />
      <div className="flex items-center gap-3 ml-auto">
        <LowStockNotification />
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
          <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
        </div>
      </div>
    </header>
  );
}
