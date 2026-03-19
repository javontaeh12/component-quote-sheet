'use client';

import { useEffect, useState, useMemo, Fragment } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Input, Select } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Phone,
  Search,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  DollarSign,
  Filter,
  TrendingUp,
  Headphones,
} from 'lucide-react';

interface CallSession {
  id: string;
  vapi_call_id: string | null;
  caller_phone: string | null;
  customer_id: string | null;
  transcript: string | null;
  intent: string | null;
  confidence: number | null;
  service_type: string | null;
  urgency: string | null;
  extracted_info: Record<string, unknown> | null;
  proposed_slot: Record<string, unknown> | null;
  outcome: string | null;
  escalation_reason: string | null;
  ai_model: string | null;
  ai_cost: number | null;
  duration_seconds: number | null;
  recording_url: string | null;
  created_at: string;
}

const INTENT_COLORS: Record<string, string> = {
  booking: 'bg-blue-100 text-blue-700',
  emergency: 'bg-red-100 text-red-700',
  inquiry: 'bg-purple-100 text-purple-700',
  complaint: 'bg-orange-100 text-orange-700',
  cancel: 'bg-gray-100 text-gray-700',
  reschedule: 'bg-amber-100 text-amber-700',
  followup: 'bg-teal-100 text-teal-700',
  estimate: 'bg-indigo-100 text-indigo-700',
  maintenance: 'bg-green-100 text-green-700',
};

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const OUTCOME_COLORS: Record<string, string> = {
  booked: 'bg-green-100 text-green-700',
  escalated: 'bg-red-100 text-red-700',
  resolved: 'bg-blue-100 text-blue-700',
  voicemail: 'bg-gray-100 text-gray-700',
  dropped: 'bg-gray-100 text-gray-500',
  transferred: 'bg-amber-100 text-amber-700',
  callback_scheduled: 'bg-purple-100 text-purple-700',
  no_action: 'bg-gray-100 text-gray-500',
};

const INTENT_OPTIONS = [
  { value: '', label: 'All Intents' },
  { value: 'booking', label: 'Booking' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'cancel', label: 'Cancel' },
  { value: 'reschedule', label: 'Reschedule' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'maintenance', label: 'Maintenance' },
];

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatAiCost(cost: number | null): string {
  if (cost === null || cost === undefined) return '-';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

// Vapi cost estimate: ~$0.05/min (STT + TTS + telephony + model)
function estimateVapiCost(durationSeconds: number | null): number {
  if (!durationSeconds) return 0;
  return (durationSeconds / 60) * 0.05;
}

function formatPhone(phone: string | null): string {
  if (!phone) return 'Unknown';
  // Format US phone numbers
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export default function CallsPage() {
  const { isLoading: authLoading } = useAuth();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [intentFilter, setIntentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) fetchCalls();
  }, [authLoading]);

  const fetchCalls = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCalls(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const matchesSearch =
        !search ||
        (call.caller_phone && call.caller_phone.includes(search)) ||
        (call.service_type && call.service_type.toLowerCase().includes(search.toLowerCase())) ||
        (call.transcript && call.transcript.toLowerCase().includes(search.toLowerCase()));
      const matchesIntent = !intentFilter || call.intent === intentFilter;
      const matchesDateFrom = !dateFrom || call.created_at >= dateFrom;
      const matchesDateTo = !dateTo || call.created_at <= dateTo + 'T23:59:59';
      return matchesSearch && matchesIntent && matchesDateFrom && matchesDateTo;
    });
  }, [calls, search, intentFilter, dateFrom, dateTo]);

  // Summary stats
  const stats = useMemo(() => {
    const totalCalls = calls.length;
    const totalAiCost = calls.reduce((sum, c) => sum + (Number(c.ai_cost) || 0), 0);
    const totalVapiCost = calls.reduce((sum, c) => sum + estimateVapiCost(c.duration_seconds), 0);
    const totalCost = totalAiCost + totalVapiCost;
    const avgDuration = totalCalls > 0
      ? Math.round(calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / totalCalls)
      : 0;
    const avgConfidence = totalCalls > 0
      ? calls.reduce((sum, c) => sum + (Number(c.confidence) || 0), 0) / totalCalls
      : 0;
    const escalated = calls.filter((c) => c.outcome === 'escalated').length;
    return { totalCalls, totalAiCost, totalVapiCost, totalCost, avgDuration, avgConfidence, escalated };
  }, [calls]);

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load call sessions</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Headphones className="w-6 h-6 text-blue-600" />
            AI Call Transcripts
          </h1>
          <p className="text-gray-600 mt-1">Review AI CSR call sessions, transcripts, and outcomes</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase">Total Calls</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase">Avg Confidence</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(stats.avgConfidence * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-red-500 uppercase">Escalated</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.escalated}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-600 uppercase">Total Cost</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{formatAiCost(stats.totalCost)}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-[10px] text-gray-500">AI: {formatAiCost(stats.totalAiCost)}</span>
            <span className="text-[10px] text-gray-500">Vapi: {formatAiCost(stats.totalVapiCost)}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by phone, service type, or transcript..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={INTENT_OPTIONS}
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value)}
          className="w-full sm:w-44"
        />
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-40"
          />
          <span className="text-gray-400 text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {/* Calls List */}
      {filteredCalls.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No call sessions found</h3>
            <p className="text-gray-600">
              {search || intentFilter || dateFrom || dateTo
                ? 'Try adjusting your filters'
                : 'Call sessions will appear here as the AI CSR handles calls'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Mobile card layout */}
          <div className="sm:hidden divide-y divide-gray-200">
            {filteredCalls.map((call) => {
              const isExpanded = expandedId === call.id;
              return (
                <div key={call.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : call.id)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{formatPhone(call.caller_phone)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {call.intent && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INTENT_COLORS[call.intent] || 'bg-gray-100 text-gray-700'}`}>
                              {call.intent}
                            </span>
                          )}
                          {call.outcome && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_COLORS[call.outcome] || 'bg-gray-100 text-gray-700'}`}>
                              {call.outcome.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(call.created_at)} &middot; {formatDuration(call.duration_seconds)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {call.service_type && (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Service</span>
                              <p className="text-sm text-gray-700">{call.service_type}</p>
                            </div>
                          )}
                          {call.urgency && (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Urgency</span>
                              <p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_COLORS[call.urgency] || 'bg-gray-100 text-gray-700'}`}>
                                  {call.urgency}
                                </span>
                              </p>
                            </div>
                          )}
                          {call.confidence !== null && (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Confidence</span>
                              <p className="text-sm text-gray-700 font-medium">{(Number(call.confidence) * 100).toFixed(0)}%</p>
                            </div>
                          )}
                          {(call.ai_cost !== null || call.duration_seconds) && (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Cost</span>
                              <p className="text-sm text-gray-700 font-mono">{formatAiCost((Number(call.ai_cost) || 0) + estimateVapiCost(call.duration_seconds))}</p>
                              <p className="text-[10px] text-gray-400">AI: {formatAiCost(call.ai_cost)} + Vapi: {formatAiCost(estimateVapiCost(call.duration_seconds))}</p>
                            </div>
                          )}
                        </div>

                        {call.transcript && (
                          <div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Transcript Preview</span>
                            <p className="text-sm text-gray-700 mt-1 line-clamp-4 whitespace-pre-wrap">{call.transcript}</p>
                          </div>
                        )}

                        {call.escalation_reason && (
                          <div className="bg-red-50 rounded-lg p-3">
                            <span className="text-xs font-bold text-red-500 uppercase">Escalation Reason</span>
                            <p className="text-sm text-red-700 mt-1">{call.escalation_reason}</p>
                          </div>
                        )}

                        <Link
                          href={`/admin/calls/${call.id}`}
                          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          View Full Details &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                  <th className="px-4 py-3 font-medium">Date/Time</th>
                  <th className="px-4 py-3 font-medium">Caller</th>
                  <th className="px-4 py-3 font-medium">Intent</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium">Urgency</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCalls.map((call) => {
                  const isExpanded = expandedId === call.id;
                  return (
                    <Fragment key={call.id}>
                      <tr
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : call.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{formatDate(call.created_at)}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(call.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900">{formatPhone(call.caller_phone)}</span>
                        </td>
                        <td className="px-4 py-3">
                          {call.intent ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INTENT_COLORS[call.intent] || 'bg-gray-100 text-gray-700'}`}>
                              {call.intent}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {call.confidence !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    Number(call.confidence) >= 0.8
                                      ? 'bg-green-500'
                                      : Number(call.confidence) >= 0.5
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Number(call.confidence) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 font-medium">{(Number(call.confidence) * 100).toFixed(0)}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {call.urgency ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_COLORS[call.urgency] || 'bg-gray-100 text-gray-700'}`}>
                              {call.urgency}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{call.service_type || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {call.outcome ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_COLORS[call.outcome] || 'bg-gray-100 text-gray-700'}`}>
                              {call.outcome.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{formatDuration(call.duration_seconds)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 font-mono">{formatAiCost((Number(call.ai_cost) || 0) + estimateVapiCost(call.duration_seconds))}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="px-4 pb-4 bg-gray-50/50">
                            <div className="bg-white rounded-lg border border-gray-200 p-5 mt-1 space-y-4">
                              {/* Call metadata */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {call.ai_model && (
                                  <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase">AI Model</span>
                                    <p className="text-sm text-gray-700 font-mono mt-0.5">{call.ai_model}</p>
                                  </div>
                                )}
                                {call.vapi_call_id && (
                                  <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase">Call ID</span>
                                    <p className="text-sm text-gray-500 font-mono mt-0.5 truncate">{call.vapi_call_id}</p>
                                  </div>
                                )}
                                {call.recording_url && (
                                  <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase">Recording</span>
                                    <p className="mt-0.5">
                                      <a
                                        href={call.recording_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Listen &rarr;
                                      </a>
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Transcript preview */}
                              {call.transcript && (
                                <div>
                                  <span className="text-xs font-bold text-gray-400 uppercase">Transcript Preview</span>
                                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap line-clamp-6 bg-gray-50 rounded-lg p-3 font-mono">
                                    {call.transcript}
                                  </p>
                                </div>
                              )}

                              {/* Escalation */}
                              {call.escalation_reason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <span className="text-xs font-bold text-red-500 uppercase flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Escalation Reason
                                  </span>
                                  <p className="text-sm text-red-700 mt-1">{call.escalation_reason}</p>
                                </div>
                              )}

                              {/* Extracted info preview */}
                              {call.extracted_info && Object.keys(call.extracted_info).length > 0 && (
                                <div>
                                  <span className="text-xs font-bold text-gray-400 uppercase">Extracted Info</span>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                                    {Object.entries(call.extracted_info).slice(0, 6).map(([key, value]) => (
                                      <div key={key} className="bg-gray-50 rounded px-2 py-1.5">
                                        <span className="text-[10px] text-gray-400 uppercase">{key.replace(/_/g, ' ')}</span>
                                        <p className="text-xs text-gray-700 truncate">{String(value)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <Link
                                href={`/admin/calls/${call.id}`}
                                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Full Details &rarr;
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

