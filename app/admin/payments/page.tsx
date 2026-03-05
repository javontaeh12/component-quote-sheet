'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input, Select } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CreditCard,
  DollarSign,
  Search,
  Clock,
  CheckCircle2,
  TrendingUp,
  Banknote,
} from 'lucide-react';

interface Payment {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  amount: number;
  method: 'square' | 'cash' | 'check';
  status: 'paid' | 'pending' | 'refunded';
  notes: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
  bookings?: { service_type: string } | null;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
];

const METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'square', label: 'Square' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
];

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  refunded: 'bg-red-100 text-red-700',
};

const METHOD_LABELS: Record<string, string> = {
  square: 'Square',
  cash: 'Cash',
  check: 'Check',
};

export default function PaymentsPage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!authLoading) fetchPayments();
  }, [authLoading]);

  const fetchPayments = async () => {
    if (!groupId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payments')
        .select('*, customers(full_name), bookings(service_type)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const customerName = p.customers?.full_name || '';
      const matchesSearch =
        !search || customerName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesMethod = !methodFilter || p.method === methodFilter;
      const matchesFrom = !dateFrom || p.created_at >= dateFrom;
      const matchesTo = !dateTo || p.created_at <= dateTo + 'T23:59:59';
      return matchesSearch && matchesStatus && matchesMethod && matchesFrom && matchesTo;
    });
  }, [payments, search, statusFilter, methodFilter, dateFrom, dateTo]);

  const summaryStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const monthPayments = payments.filter(
      (p) => p.created_at >= monthStart && p.status === 'paid'
    );
    const todayPayments = payments.filter(
      (p) => p.created_at >= todayStart && p.status === 'paid'
    );
    const outstanding = payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      monthRevenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      outstanding,
      todayCollected: todayPayments.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payments]);

  // Aging report
  const agingReport = useMemo(() => {
    const now = new Date();
    const pending = payments.filter((p) => p.status === 'pending');
    const aging = { current: 0, days30: 0, days60: 0, days90: 0 };
    pending.forEach((p) => {
      const days = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 30) aging.current += p.amount;
      else if (days <= 60) aging.days30 += p.amount;
      else if (days <= 90) aging.days60 += p.amount;
      else aging.days90 += p.amount;
    });
    return aging;
  }, [payments]);

  const handleMarkPaid = async (id: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payments')
        .update({ status: 'paid' })
        .eq('id', id)
        .select('*, customers(full_name), bookings(service_type)')
        .single();

      if (error) throw error;
      setPayments(payments.map((p) => (p.id === id ? data : p)));
    } catch (err) {
      console.error('Failed to update payment:', err);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load payments</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-1">Track revenue and manage payment records</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(summaryStats.monthRevenue)}
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(summaryStats.outstanding)}
                </p>
              </div>
              <div className={`${summaryStats.outstanding > 0 ? 'bg-yellow-500' : 'bg-green-500'} p-3 rounded-lg`}>
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Collected Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(summaryStats.todayCollected)}
                </p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <Banknote className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Report */}
      {summaryStats.outstanding > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Aging Report</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Current</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(agingReport.current)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">31-60 Days</p>
                <p className="text-lg font-bold text-yellow-600">{formatCurrency(agingReport.days30)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">61-90 Days</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(agingReport.days60)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">90+ Days</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(agingReport.days90)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select
          options={METHOD_OPTIONS}
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="w-full sm:w-40"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-40"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-40"
          placeholder="To"
        />
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-600">
                {search || statusFilter || methodFilter ? 'Try adjusting your filters' : 'Payments will appear here when recorded'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile layout */}
              <div className="sm:hidden divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {payment.customers?.full_name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {payment.bookings?.service_type || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(payment.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${STATUS_COLORS[payment.status]}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{METHOD_LABELS[payment.method]}</span>
                      {payment.status === 'pending' && (
                        <Button size="sm" onClick={() => handleMarkPaid(payment.id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Customer</th>
                      <th className="px-6 py-3 font-medium">Service</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Method</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {payment.customers?.full_name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {payment.bookings?.service_type || 'N/A'}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                            <DollarSign className="w-3 h-3" />
                            {METHOD_LABELS[payment.method]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[payment.status]}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {payment.status === 'pending' && (
                            <Button size="sm" onClick={() => handleMarkPaid(payment.id)}>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
