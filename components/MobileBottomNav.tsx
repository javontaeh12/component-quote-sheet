'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  FileText,
  Code,
  Loader2,
} from 'lucide-react';

const DEVELOPER_EMAIL = 'javontaedharden@gmail.com';

const navItems = [
  { name: 'Home', href: '/admin', icon: LayoutDashboard },
  { name: 'Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Docs', href: '/admin/documents', icon: FileText },
  { name: 'AI Help', href: '/admin/ai-helper', icon: MessageSquare },
];

const developerItem = { name: 'Developer', href: '/admin/users', icon: Code };

export function MobileBottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  // Clear loading state when navigation completes (pathname changes)
  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  const items = profile?.email === DEVELOPER_EMAIL
    ? [...navItems, developerItem]
    : navItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const isLoading = loadingHref === item.href && !isActive;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => {
                if (!isActive) setLoadingHref(item.href);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive
                  ? 'text-blue-600'
                  : isLoading
                    ? 'text-blue-400'
                    : 'text-gray-500 active:text-gray-700'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              )}
              <span className="text-[10px] font-medium leading-tight">
                {isLoading ? 'Loading...' : item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
