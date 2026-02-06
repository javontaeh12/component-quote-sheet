'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Package, AlertTriangle, Truck } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  totalVans: number;
}

export default function AdminDashboard() {
  const { profile, groupId, group } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    totalVans: 0,
  });
  const [lowStockList, setLowStockList] = useState<Array<{
    id: string;
    name: string;
    quantity: number;
    min_quantity: number;
    van_name: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!groupId) return;
      try {
        const supabase = createClient();

        const userVanId = profile?.van_id;

        // Dashboard shows only the user's assigned van inventory
        // If no van assigned, show 0 items (not all vans)
        let itemsQuery = supabase.from('inventory_items').select('id, name, quantity, min_quantity, van_id').eq('group_id', groupId);
        if (userVanId) {
          itemsQuery = itemsQuery.eq('van_id', userVanId);
        } else {
          // No van assigned — force empty result
          itemsQuery = itemsQuery.eq('van_id', 'no-van-assigned');
        }

        const [itemsResult, vansResult] = await Promise.all([
          itemsQuery,
          supabase.from('vans').select('id, name').eq('group_id', groupId),
        ]);

        const items = itemsResult.data || [];
        const vans = vansResult.data || [];

        const lowStock = items.filter((item) => item.quantity < item.min_quantity);
        const vanMap = new Map(vans.map((v) => [v.id, v.name]));

        setStats({
          totalItems: items.length,
          lowStockItems: lowStock.length,
          totalVans: vans.length,
        });

        setLowStockList(
          lowStock.slice(0, 5).map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            min_quantity: item.min_quantity,
            van_name: vanMap.get(item.van_id) || 'Unknown',
          }))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

  const statCards = [
    {
      title: 'Total Items',
      value: stats.totalItems,
      icon: Package,
      color: 'bg-blue-500',
      href: '/admin/inventory',
    },
    {
      title: 'Low Stock',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: stats.lowStockItems > 0 ? 'bg-red-500' : 'bg-green-500',
      href: '/admin/inventory',
    },
    ...(isAdminOrManager
      ? [
          {
            title: 'Vans',
            value: stats.totalVans,
            icon: Truck,
            color: 'bg-purple-500',
            href: '/admin/inventory',
          },
        ]
      : []),
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load dashboard</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-4">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-gray-600 text-xs sm:text-sm">
          {group ? `${group.name} — ` : ''}Here&apos;s an overview of your inventory
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {lowStockList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile card layout */}
            <div className="sm:hidden space-y-3">
              {lowStockList.map((item) => (
                <div key={item.id} className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 shrink-0">
                      {item.quantity}/{item.min_quantity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.van_name}</p>
                </div>
              ))}
            </div>

            {/* Desktop table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Item</th>
                    <th className="pb-3 font-medium">Van</th>
                    <th className="pb-3 font-medium">Current</th>
                    <th className="pb-3 font-medium">Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockList.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 text-gray-600">{item.van_name}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">{item.min_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link
              href="/admin/inventory"
              className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all inventory →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
