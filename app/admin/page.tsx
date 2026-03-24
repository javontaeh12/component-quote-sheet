'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  Package,
  AlertTriangle,
  Truck,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Users,
  FileText,
  FileCheck,
  Clock,
  Wrench,
  Plus,
  ArrowRight,
  TrendingUp,
  Star,
  Phone,
  Crown,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  // Inventory
  totalItems: number;
  lowStockItems: number;
  totalVans: number;
  // Business
  todayBookings: number;
  activeWorkOrders: number;
  monthRevenue: number;
  totalCustomers: number;
  openQuotes: number;
  activeContracts: number;
  pendingFollowUps: number;
  activeMemberships: number;
  expiringContracts: number;
}

interface BookingItem {
  id: string;
  name: string;
  contact: string;
  service_type: string;
  start_time: string;
  status: string;
}

interface PaymentItem {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  customer_name?: string;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  van_name: string;
}

interface WorkOrderItem {
  id: string;
  description: string;
  status: string;
  priority: string;
  scheduled_date: string;
  customer_name?: string;
}

interface LatestCallItem {
  id: string;
  caller_phone: string | null;
  intent: string | null;
  service_type: string | null;
  urgency: string | null;
  outcome: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface ExpiringContractItem {
  id: string;
  title: string;
  end_date: string;
  type: string;
  customer_name: string;
}

export default function AdminDashboard() {
  const { profile, groupId, group } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    totalVans: 0,
    todayBookings: 0,
    activeWorkOrders: 0,
    monthRevenue: 0,
    totalCustomers: 0,
    openQuotes: 0,
    activeContracts: 0,
    pendingFollowUps: 0,
    activeMemberships: 0,
    expiringContracts: 0,
  });
  const [todaySchedule, setTodaySchedule] = useState<BookingItem[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentItem[]>([]);
  const [lowStockList, setLowStockList] = useState<LowStockItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<WorkOrderItem[]>([]);
  const [latestCall, setLatestCall] = useState<LatestCallItem | null>(null);
  const [expiringContractsList, setExpiringContractsList] = useState<ExpiringContractItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!groupId) return;
      try {
        const supabase = createClient();
        const userVanId = profile?.van_id;

        // Date helpers
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Inventory query (scoped to user's van)
        let itemsQuery = supabase
          .from('inventory_items')
          .select('id, name, quantity, min_quantity, van_id')
          .eq('group_id', groupId);
        if (userVanId) {
          itemsQuery = itemsQuery.eq('van_id', userVanId);
        } else {
          itemsQuery = itemsQuery.eq('van_id', 'no-van-assigned');
        }

        // Fire all queries in parallel
        const [
          itemsResult,
          vansResult,
          todayBookingsResult,
          activeWOResult,
          monthPaymentsResult,
          customersResult,
          openQuotesResult,
          activeContractsResult,
          followUpsResult,
          recentPaymentsResult,
          latestCallResult,
          activeMembershipsResult,
          expiringContractsResult,
        ] = await Promise.all([
          // Inventory
          itemsQuery,
          supabase.from('vans').select('id, name').eq('group_id', groupId),
          // Today's bookings
          supabase
            .from('bookings')
            .select('id, name, contact, service_type, start_time, status')
            .eq('group_id', groupId)
            .gte('start_time', todayStart)
            .lt('start_time', todayEnd)
            .order('start_time', { ascending: true }),
          // Active work orders
          supabase
            .from('work_orders')
            .select('id, description, status, priority, scheduled_date')
            .eq('group_id', groupId)
            .in('status', ['assigned', 'en_route', 'in_progress']),
          // This month's payments
          supabase
            .from('payments')
            .select('id, amount, status')
            .eq('group_id', groupId)
            .eq('status', 'paid')
            .gte('created_at', monthStart),
          // Total customers
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId),
          // Open quotes
          supabase
            .from('quotes')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .in('status', ['draft', 'sent']),
          // Active contracts
          supabase
            .from('contracts')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .in('status', ['active', 'signed']),
          // Pending follow-ups
          supabase
            .from('follow_ups')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('status', 'pending'),
          // Recent payments (last 5)
          supabase
            .from('payments')
            .select('id, amount, method, status, created_at, customer_id')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })
            .limit(5),
          // Latest AI call (global, no group_id)
          supabase
            .from('call_sessions')
            .select('id, caller_phone, intent, service_type, urgency, outcome, duration_seconds, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          // Active memberships
          supabase
            .from('contracts')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('type', 'membership')
            .in('status', ['active', 'signed']),
          // Expiring contracts (within 30 days)
          supabase
            .from('contracts')
            .select('id, title, end_date, type, customers(full_name)')
            .eq('group_id', groupId)
            .in('status', ['active', 'signed'])
            .gte('end_date', new Date().toISOString())
            .lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
            .order('end_date', { ascending: true }),
        ]);

        // Process inventory
        const items = itemsResult.data || [];
        const vans = vansResult.data || [];
        const lowStock = items.filter((item) => item.quantity < item.min_quantity);
        const vanMap = new Map(vans.map((v) => [v.id, v.name]));

        // Calculate revenue
        const monthPayments = monthPaymentsResult.data || [];
        const monthRevenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Active work orders list
        const workOrders = activeWOResult.data || [];

        setStats({
          totalItems: items.length,
          lowStockItems: lowStock.length,
          totalVans: vans.length,
          todayBookings: (todayBookingsResult.data || []).length,
          activeWorkOrders: workOrders.length,
          monthRevenue,
          totalCustomers: customersResult.count || 0,
          openQuotes: openQuotesResult.count || 0,
          activeContracts: activeContractsResult.count || 0,
          pendingFollowUps: followUpsResult.count || 0,
          activeMemberships: activeMembershipsResult.count || 0,
          expiringContracts: (expiringContractsResult.data || []).length,
        });

        setTodaySchedule((todayBookingsResult.data || []).slice(0, 5));

        setRecentPayments(
          (recentPaymentsResult.data || []).map((p) => ({
            id: p.id,
            amount: p.amount,
            method: p.method,
            status: p.status,
            created_at: p.created_at,
          }))
        );

        setLowStockList(
          lowStock.slice(0, 5).map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            min_quantity: item.min_quantity,
            van_name: vanMap.get(item.van_id) || 'Unknown',
          }))
        );

        setActiveOrders(
          workOrders.slice(0, 5).map((wo) => ({
            id: wo.id,
            description: wo.description,
            status: wo.status,
            priority: wo.priority,
            scheduled_date: wo.scheduled_date,
          }))
        );

        // Latest AI call
        if (latestCallResult.data) {
          setLatestCall(latestCallResult.data as LatestCallItem);
        }

        // Expiring contracts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expContracts = (expiringContractsResult.data || []).map((c: any) => ({
          id: c.id,
          title: c.title || 'Untitled Contract',
          end_date: c.end_date,
          type: c.type || 'contract',
          customer_name: c.customers?.full_name || 'Unknown',
        }));
        setExpiringContractsList(expContracts.slice(0, 5));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [groupId, profile?.van_id]);

  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': case 'en_route': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': case 'no-show': return 'bg-red-100 text-red-700';
      case 'assigned': return 'bg-purple-100 text-purple-700';
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'normal': return 'bg-blue-100 text-blue-700';
      case 'low': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Stat cards configuration
  const topStats = [
    {
      title: "Today's Bookings",
      value: stats.todayBookings,
      icon: CalendarDays,
      color: 'bg-blue-500',
      href: '/admin/bookings',
    },
    {
      title: 'Active Jobs',
      value: stats.activeWorkOrders,
      icon: ClipboardList,
      color: stats.activeWorkOrders > 0 ? 'bg-yellow-500' : 'bg-gray-400',
      href: '/admin/service',
    },
    {
      title: 'This Month',
      value: formatCurrency(stats.monthRevenue),
      icon: DollarSign,
      color: 'bg-green-500',
      href: '/admin/payments',
    },
    {
      title: 'Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-indigo-500',
      href: '/admin/customers',
    },
    {
      title: 'Open Quotes',
      value: stats.openQuotes,
      icon: FileText,
      color: stats.openQuotes > 0 ? 'bg-orange-500' : 'bg-gray-400',
      href: '/admin/quotes',
    },
    {
      title: 'Contracts',
      value: stats.activeContracts,
      icon: FileCheck,
      color: 'bg-teal-500',
      href: '/admin/contracts',
    },
    {
      title: 'Memberships',
      value: stats.activeMemberships,
      icon: Crown,
      color: 'bg-amber-500',
      href: '/admin/memberships',
    },
  ];

  const inventoryStats = [
    {
      title: 'Van Inventory',
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
    ...(stats.pendingFollowUps > 0
      ? [
          {
            title: 'Follow-ups',
            value: stats.pendingFollowUps,
            icon: Clock,
            color: 'bg-amber-500',
            href: '/admin/customers',
          },
        ]
      : []),
  ];

  const quickActions = [
    { label: 'New Booking', href: '/admin/bookings', icon: CalendarDays },
    { label: 'New Quote', href: '/admin/quotes', icon: FileText },
    { label: 'Add Customer', href: '/admin/customers', icon: Users },
    { label: 'Service Report', href: '/admin/service-report', icon: ClipboardList },
    { label: 'Parts Store', href: '/admin/parts-store', icon: Package },
    { label: 'View Analytics', href: '/admin/analytics', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <p className="text-blue-300 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1">
            {group?.name || 'HVAC Portal'}
          </p>
          <h1 className="text-xl sm:text-3xl font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Top Stats — Business Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {topStats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`${stat.color} p-2 rounded-lg shrink-0`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 truncate">{stat.title}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Inventory Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {inventoryStats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`${stat.color} p-2 rounded-lg shrink-0`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 truncate">{stat.title}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-5 h-5 text-blue-500" />
                Today&apos;s Schedule
              </CardTitle>
              <Link
                href="/admin/bookings"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No bookings today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedule.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center shrink-0">
                      <p className="text-sm font-bold text-blue-600">{formatTime(booking.start_time)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{booking.name}</p>
                      <p className="text-xs text-gray-500 truncate">{booking.service_type}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Work Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="w-5 h-5 text-yellow-500" />
                Active Jobs
              </CardTitle>
              <Link
                href="/admin/service"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeOrders.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active jobs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((wo) => (
                  <div key={wo.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {wo.description || 'Work Order'}
                      </p>
                      {wo.scheduled_date && (
                        <p className="text-xs text-gray-500">
                          {new Date(wo.scheduled_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(wo.priority)}`}>
                        {wo.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(wo.status)}`}>
                        {wo.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-5 h-5 text-green-500" />
                Recent Payments
              </CardTitle>
              <Link
                href="/admin/payments"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{payment.method}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(payment.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Low Stock Alerts
              </CardTitle>
              <Link
                href="/admin/inventory"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockList.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All stocked up</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.van_name}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 shrink-0">
                      {item.quantity}/{item.min_quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest AI Call */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="w-5 h-5 text-purple-500" />
                Latest AI Call
              </CardTitle>
              <Link
                href="/admin/calls"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!latestCall ? (
              <div className="text-center py-6 text-gray-400">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No AI calls yet</p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 text-sm">{latestCall.caller_phone || 'Unknown'}</p>
                  <span className="text-xs text-gray-400">{formatDate(latestCall.created_at)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {latestCall.intent && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {latestCall.intent.replace('_', ' ')}
                    </span>
                  )}
                  {latestCall.urgency && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        latestCall.urgency === 'emergency'
                          ? 'bg-red-100 text-red-700'
                          : latestCall.urgency === 'urgent'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {latestCall.urgency}
                    </span>
                  )}
                  {latestCall.outcome && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {latestCall.outcome}
                    </span>
                  )}
                </div>
                {latestCall.duration_seconds && (
                  <p className="text-xs text-gray-500">
                    {Math.round(latestCall.duration_seconds / 60)} min call &bull; {latestCall.service_type || 'General'}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Renewals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="w-5 h-5 text-teal-500" />
                Contract Renewals
                {stats.expiringContracts > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    {stats.expiringContracts}
                  </span>
                )}
              </CardTitle>
              <Link
                href="/admin/contracts"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {expiringContractsList.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contracts expiring soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiringContractsList.map((contract) => (
                  <Link key={contract.id} href={`/admin/contracts/${contract.id}`}>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{contract.title}</p>
                        <p className="text-xs text-gray-500">{contract.customer_name}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-medium text-orange-700">
                          Expires {new Date(contract.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">
                          {contract.type}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {isAdminOrManager && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="w-5 h-5 text-amber-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                >
                  <action.icon className="w-5 h-5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
