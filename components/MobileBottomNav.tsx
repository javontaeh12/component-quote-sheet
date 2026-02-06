'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  FileText,
} from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/admin', icon: LayoutDashboard },
  { name: 'Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Docs', href: '/admin/documents', icon: FileText },
  { name: 'AI Help', href: '/admin/ai-helper', icon: MessageSquare },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 active:text-gray-700'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium leading-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
