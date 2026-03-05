'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ServiceReportBuilder } from '@/components/ServiceReportBuilder';
import {
  FileText,
  Plus,
  Search,
  Send,
  CheckCircle2,
  Clock,
  Eye,
  Copy,
  Trash2,
  Edit3,
  Link2,
} from 'lucide-react';

interface ServiceReportRow {
  id: string;
  customer_id: string | null;
  status: string;
  customer_name: string | null;
  equipment_info: { equipment_type: string; make: string; model: string } | null;
  repair_options: Array<{ subtotal: number; is_recommended: boolean; name: string }> | null;
  service_date: string;
  share_token: string | null;
  created_at: string;
  customers?: { full_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100', icon: Edit3 },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  sent: { label: 'Sent', color: 'text-purple-700', bg: 'bg-purple-100', icon: Send },
};

export default function ServiceReportPage() {
  const { groupId, profile, isLoading: authLoading } = useAuth();
  const [reports, setReports] = useState<ServiceReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && groupId) fetchReports();
  }, [authLoading, groupId]);

  const fetchReports = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('service_reports')
      .select('id, customer_id, status, customer_name, equipment_info, repair_options, service_date, share_token, created_at, customers(full_name)')
      .eq('group_id', groupId!)
      .order('created_at', { ascending: false });
    // Supabase returns joined table as array; normalize to single object
    const normalized = (data || []).map((r: Record<string, unknown>) => ({
      ...r,
      customers: Array.isArray(r.customers) ? r.customers[0] || null : r.customers,
    })) as ServiceReportRow[];
    setReports(normalized);
    setIsLoading(false);
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Delete this service report?')) return;
    const supabase = createClient();
    await supabase.from('service_report_media').delete().eq('service_report_id', id);
    await supabase.from('service_reports').delete().eq('id', id);
    setReports(reports.filter((r) => r.id !== id));
  };

  const copyShareLink = (token: string, id: string) => {
    const url = `${window.location.origin}/report/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const markAsSent = async (id: string) => {
    const supabase = createClient();
    await supabase.from('service_reports').update({ status: 'sent', updated_at: new Date().toISOString() } as Record<string, unknown>).eq('id', id);
    setReports(reports.map((r) => (r.id === id ? { ...r, status: 'sent' } : r)));
  };

  const filtered = reports.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = (r.customers?.full_name || r.customer_name || '').toLowerCase();
      const equip = (r.equipment_info?.equipment_type || '').toLowerCase();
      return name.includes(s) || equip.includes(s);
    }
    return true;
  });

  const statusCounts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const getRecommendedTotal = (opts: ServiceReportRow['repair_options']) => {
    if (!opts) return null;
    const rec = opts.find((o) => o.is_recommended);
    return rec ? rec.subtotal : opts[0]?.subtotal || null;
  };

  if (isBuilderOpen || editingReportId !== null) {
    return (
      <ServiceReportBuilder
        reportId={editingReportId}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingReportId(null);
        }}
        onSaved={fetchReports}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Build and share professional service reports</p>
        </div>
        <Button onClick={() => setIsBuilderOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Report
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              className={`p-3 rounded-xl border text-left transition-colors ${
                statusFilter === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className="text-sm font-medium text-gray-700">{config.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{statusCounts[key] || 0}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by customer or equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!pl-10"
          />
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{search || statusFilter ? 'No reports match your filters' : 'No service reports yet'}</p>
          {!search && !statusFilter && (
            <Button className="mt-4" onClick={() => setIsBuilderOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Your First Report
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
            const Icon = config.icon;
            const total = getRecommendedTotal(report.repair_options);
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="!py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {report.customers?.full_name || report.customer_name || 'No Customer'}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                          <Icon className="w-3 h-3" /> {config.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        {report.equipment_info?.equipment_type && (
                          <span>{report.equipment_info.equipment_type}{report.equipment_info.make ? ` - ${report.equipment_info.make}` : ''}</span>
                        )}
                        <span>{formatDate(report.service_date || report.created_at)}</span>
                        {total !== null && <span className="font-medium text-gray-700">{formatCurrency(total)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {report.share_token && (
                        <>
                          <a
                            href={`/report/${report.share_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Report"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => copyShareLink(report.share_token!, report.id)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Copy Link"
                          >
                            {copiedId === report.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                          </button>
                          {report.status === 'completed' && (
                            <button
                              onClick={() => markAsSent(report.id)}
                              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Mark as Sent"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => setEditingReportId(report.id)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={report.status === 'draft' ? 'Resume' : 'Edit'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
