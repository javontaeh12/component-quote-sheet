'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input, Modal } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  FileSignature,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
} from 'lucide-react';

interface Contract {
  id: string;
  customer_id: string | null;
  type: string;
  title: string;
  terms: Record<string, string>;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  status: string;
  total_value: number;
  signed_url: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
}

interface CustomerOption {
  id: string;
  full_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100' },
  sent: { label: 'Sent', color: 'text-blue-700', bg: 'bg-blue-100' },
  signed: { label: 'Signed', color: 'text-purple-700', bg: 'bg-purple-100' },
  active: { label: 'Active', color: 'text-green-700', bg: 'bg-green-100' },
  expired: { label: 'Expired', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
};

const CONTRACT_TYPES = [
  { value: 'maintenance', label: 'Maintenance Agreement' },
  { value: 'membership', label: 'Membership' },
  { value: 'service_agreement', label: 'Service Agreement' },
  { value: 'warranty', label: 'Warranty' },
];

export default function ContractsPage() {
  const { groupId, profile, isLoading: authLoading } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const [form, setForm] = useState({
    customer_id: '', type: 'maintenance', title: '',
    start_date: '', end_date: '', auto_renew: false,
    total_value: 0, scope: '', frequency: '', payment_terms: '',
  });

  useEffect(() => {
    if (!authLoading && groupId) fetchData();
  }, [authLoading, groupId]);

  const fetchData = async () => {
    const supabase = createClient();
    const [contractsRes, customersRes] = await Promise.all([
      supabase.from('contracts').select('*, customers(full_name)').eq('group_id', groupId!).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name').eq('group_id', groupId!).order('full_name'),
    ]);
    setContracts(contractsRes.data || []);
    setCustomers(customersRes.data || []);
    setIsLoading(false);
  };

  const createContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('contracts').insert({
      customer_id: form.customer_id || null,
      type: form.type,
      title: form.title,
      terms: { scope: form.scope, frequency: form.frequency, payment_terms: form.payment_terms },
      start_date: form.start_date,
      end_date: form.end_date,
      auto_renew: form.auto_renew,
      total_value: form.total_value,
      created_by: profile?.id,
      group_id: groupId,
    } as Record<string, unknown>).select('*, customers(full_name)').single();
    if (!error && data) {
      setContracts([data, ...contracts]);
      setIsCreateOpen(false);
      setForm({ customer_id: '', type: 'maintenance', title: '', start_date: '', end_date: '', auto_renew: false, total_value: 0, scope: '', frequency: '', payment_terms: '' });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.from('contracts').update({ status }).eq('id', id).select('*, customers(full_name)').single();
    if (!error && data) {
      setContracts((prev) => prev.map((c) => c.id === data.id ? data : c));
      if (selectedContract?.id === id) setSelectedContract(data);
    }
  };

  const filtered = contracts.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.title.toLowerCase().includes(s) || c.customers?.full_name?.toLowerCase().includes(s);
    }
    return true;
  });

  // Find contracts expiring within 30 days
  const expiringContracts = contracts.filter((c) => {
    if (c.status !== 'active' && c.status !== 'signed') return false;
    const endDate = new Date(c.end_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return endDate <= thirtyDaysFromNow && endDate >= new Date();
  });

  if (isLoading || authLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-600 mt-1">Service agreements & maintenance contracts</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Contract
        </Button>
      </div>

      {/* Renewal Alerts */}
      {expiringContracts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Renewal Alerts</span>
            </div>
            <div className="space-y-1">
              {expiringContracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span>{c.title} - {c.customers?.full_name}</span>
                  <span className="text-orange-600">Expires {formatDate(c.end_date)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['active', 'signed', 'draft', 'expired'].map((status) => (
          <Card key={status} className={`cursor-pointer ${statusFilter === status ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs font-medium text-gray-500">{STATUS_CONFIG[status]?.label}</p>
              <p className="text-xl font-bold text-gray-900">{contracts.filter((c) => c.status === status).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search contracts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Contracts List */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileSignature className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => {
                const conf = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
                return (
                  <div key={c.id} className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between" onClick={() => setSelectedContract(c)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conf.bg} ${conf.color}`}>{conf.label}</span>
                        <span className="font-medium text-gray-900">{c.title}</span>
                        {c.auto_renew && <RefreshCw className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {c.customers?.full_name || 'No customer'} &middot; {CONTRACT_TYPES.find((t) => t.value === c.type)?.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(c.total_value)}</p>
                      <p className="text-xs text-gray-500">{formatDate(c.start_date)} - {formatDate(c.end_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Contract Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Contract" className="max-w-2xl">
        <form onSubmit={createContract} className="space-y-4">
          <Input label="Title" placeholder="Annual Maintenance Agreement" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            <Input label="Total Value ($)" type="number" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })} />
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="auto_renew" checked={form.auto_renew} onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })} className="rounded" />
              <label htmlFor="auto_renew" className="text-sm">Auto-renew</label>
            </div>
          </div>
          <textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Scope of service..." rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Service Frequency" placeholder="e.g. Bi-annual" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
            <Input label="Payment Terms" placeholder="e.g. Net 30" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit">Create Contract</Button>
          </div>
        </form>
      </Modal>

      {/* Contract Detail Modal */}
      <Modal isOpen={!!selectedContract} onClose={() => setSelectedContract(null)} title="Contract Details" className="max-w-2xl">
        {selectedContract && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedContract.status]?.bg} ${STATUS_CONFIG[selectedContract.status]?.color}`}>
                  {STATUS_CONFIG[selectedContract.status]?.label}
                </span>
                {selectedContract.auto_renew && <span className="text-sm text-blue-600 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Auto-renew</span>}
              </div>
              <div className="flex gap-2">
                {selectedContract.status === 'draft' && <Button variant="outline" onClick={() => updateStatus(selectedContract.id, 'sent')}>Send</Button>}
                {selectedContract.status === 'sent' && <Button onClick={() => updateStatus(selectedContract.id, 'signed')}>Mark Signed</Button>}
                {selectedContract.status === 'signed' && <Button onClick={() => updateStatus(selectedContract.id, 'active')}>Activate</Button>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Title</p><p className="font-medium">{selectedContract.title}</p></div>
              <div><p className="text-sm text-gray-500">Customer</p><p className="font-medium">{selectedContract.customers?.full_name || '-'}</p></div>
              <div><p className="text-sm text-gray-500">Type</p><p className="font-medium">{CONTRACT_TYPES.find((t) => t.value === selectedContract.type)?.label}</p></div>
              <div><p className="text-sm text-gray-500">Value</p><p className="font-medium">{formatCurrency(selectedContract.total_value)}</p></div>
              <div><p className="text-sm text-gray-500">Start Date</p><p className="font-medium">{formatDate(selectedContract.start_date)}</p></div>
              <div><p className="text-sm text-gray-500">End Date</p><p className="font-medium">{formatDate(selectedContract.end_date)}</p></div>
            </div>

            {selectedContract.terms && Object.keys(selectedContract.terms).length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Terms</h4>
                <div className="space-y-2">
                  {Object.entries(selectedContract.terms).map(([key, value]) => (
                    value ? (
                      <div key={key}>
                        <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm">{value}</p>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
