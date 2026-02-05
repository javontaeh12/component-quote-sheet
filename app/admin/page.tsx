'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Package, AlertTriangle, Truck, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  totalVans: number;
  pendingOrders: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    totalVans: 0,
    pendingOrders: 0,
  });
  const [lowStockList, setLowStockList] = useState<Array<{
    id: string;
    name: string;
    quantity: number;
    min_quantity: number;
    van_name: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      // Fetch all stats in parallel
      const [itemsResult, vansResult, ordersResult] = await Promise.all([
        supabase.from('inventory_items').select('id, name, quantity, min_quantity, van_id'),
        supabase.from('vans').select('id, name'),
        supabase.from('orders').select('id').eq('status', 'pending'),
      ]);

      const items = itemsResult.data || [];
      const vans = vansResult.data || [];
      const orders = ordersResult.data || [];

      // Calculate low stock items
      const lowStock = items.filter((item) => item.quantity < item.min_quantity);

      // Create van lookup map
      const vanMap = new Map(vans.map((v) => [v.id, v.name]));

      setStats({
        totalItems: items.length,
        lowStockItems: lowStock.length,
        totalVans: vans.length,
        pendingOrders: orders.length,
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

      setIsLoading(false);
    };

    fetchStats();
  }, []);

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
      href: '/admin/orders',
    },
    {
      title: 'Vans',
      value: stats.totalVans,
      icon: Truck,
      color: 'bg-purple-500',
      href: '/admin/inventory',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: ShoppingCart,
      color: 'bg-amber-500',
      href: '/admin/orders',
    },
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-gray-600 mt-1">Here&apos;s an overview of your inventory</p>
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
            <div className="overflow-x-auto">
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
              href="/admin/orders"
              className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all low stock items →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
