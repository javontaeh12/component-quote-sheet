'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { Bell, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  van_name: string;
}

export function LowStockNotification() {
  const { profile } = useAuth();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.status === 'approved') {
      fetchLowStockItems();
    }
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLowStockItems = async () => {
    const supabase = createClient();

    // Get inventory items and vans
    const [itemsResult, vansResult] = await Promise.all([
      supabase.from('inventory_items').select('*'),
      supabase.from('vans').select('*'),
    ]);

    const items = itemsResult.data || [];
    const vans = vansResult.data || [];
    const vanMap = new Map(vans.map((v) => [v.id, v.name]));

    // Filter for low stock items
    let lowStock = items.filter((item) => item.quantity < item.min_quantity);

    // If tech, only show their van's items
    if (profile?.role === 'tech' && profile?.van_id) {
      lowStock = lowStock.filter((item) => item.van_id === profile.van_id);
    }

    const formattedItems = lowStock.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      min_quantity: item.min_quantity,
      van_name: vanMap.get(item.van_id) || 'Unknown',
    }));

    setLowStockItems(formattedItems);

    // Check if there are new low stock items
    const previousCount = parseInt(localStorage.getItem('lowStockCount') || '0');
    if (formattedItems.length > previousCount) {
      setHasNew(true);
    }
    localStorage.setItem('lowStockCount', formattedItems.length.toString());
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    setHasNew(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          isOpen ? 'bg-gray-100' : 'hover:bg-gray-100'
        )}
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {lowStockItems.length > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full',
              hasNew ? 'bg-red-500 text-white animate-pulse' : 'bg-red-500 text-white'
            )}
          >
            {lowStockItems.length > 9 ? '9+' : lowStockItems.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-gray-900">Low Stock Alerts</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {lowStockItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">All items are stocked</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.van_name}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {item.quantity} left
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          Min: {item.min_quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lowStockItems.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <Link
                href="/admin/orders"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View All & Create Order →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
