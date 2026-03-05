'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input, Modal } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
} from 'lucide-react';

interface QuoteLineItem {
  description: string;
  type: 'part' | 'labor' | 'flat_fee';
  quantity: number;
  unit_price: number;
  total: number;
}

interface Quote {
  id: string;
  customer_id: string | null;
  template_id: string | null;
  status: string;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
}

interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  default_items: QuoteLineItem[];
}

interface CustomerOption {
  id: string;
  full_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100', icon: FileText },
  sent: { label: 'Sent', color: 'text-blue-700', bg: 'bg-blue-100', icon: Send },
  accepted: { label: 'Accepted', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  expired: { label: 'Expired', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
};

const TAX_RATE = 0.08; // 8% tax

export default function QuotesPage() {
  const { groupId, profile, isLoading: authLoading } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // Builder state
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [builderCustomer, setBuilderCustomer] = useState('');
  const [builderItems, setBuilderItems] = useState<QuoteLineItem[]>([]);
  const [builderDiscount, setBuilderDiscount] = useState(0);
  const [builderValidUntil, setBuilderValidUntil] = useState('');
  const [builderNotes, setBuilderNotes] = useState('');
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    if (!authLoading && groupId) fetchData();
  }, [authLoading, groupId]);

  const fetchData = async () => {
    const supabase = createClient();
    const [quotesRes, templatesRes, customersRes] = await Promise.all([
      supabase.from('quotes').select('*, customers(full_name)').eq('group_id', groupId!).order('created_at', { ascending: false }),
      supabase.from('quote_templates').select('*').eq('group_id', groupId!),
      supabase.from('customers').select('id, full_name').eq('group_id', groupId!).order('full_name'),
    ]);
    setQuotes(quotesRes.data || []);
    setTemplates(templatesRes.data || []);
    setCustomers(customersRes.data || []);
    setIsLoading(false);
  };

  const openBuilder = (quote?: Quote) => {
    if (quote) {
      setBuilderId(quote.id);
      setBuilderCustomer(quote.customer_id || '');
      setBuilderItems(quote.line_items || []);
      setBuilderDiscount(quote.discount || 0);
      setBuilderValidUntil(quote.valid_until || '');
      setBuilderNotes(quote.notes || '');
    } else {
      setBuilderId(null);
      setBuilderCustomer('');
      setBuilderItems([{ description: '', type: 'part', quantity: 1, unit_price: 0, total: 0 }]);
      setBuilderDiscount(0);
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      setBuilderValidUntil(thirtyDays.toISOString().split('T')[0]);
      setBuilderNotes('');
    }
    setIsBuilderOpen(true);
  };

  const loadTemplate = (template: QuoteTemplate) => {
    setBuilderItems(template.default_items.length ? template.default_items : [{ description: '', type: 'part', quantity: 1, unit_price: 0, total: 0 }]);
    setIsTemplateOpen(false);
  };

  const addLineItem = () => {
    setBuilderItems([...builderItems, { description: '', type: 'part', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const items = [...builderItems];
    (items[index] as unknown as Record<string, unknown>)[field] = value;
    items[index].total = items[index].quantity * items[index].unit_price;
    setBuilderItems(items);
  };

  const removeLineItem = (index: number) => {
    setBuilderItems(builderItems.filter((_, i) => i !== index));
  };

  const subtotal = builderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax - builderDiscount;

  const saveQuote = async (sendAfterSave = false) => {
    if (!groupId) return;
    const supabase = createClient();
    const items = builderItems.map((item) => ({ ...item, total: item.quantity * item.unit_price }));
    const payload = {
      customer_id: builderCustomer || null,
      line_items: items,
      subtotal,
      tax,
      discount: builderDiscount,
      total,
      valid_until: builderValidUntil || null,
      notes: builderNotes || null,
      status: sendAfterSave ? 'sent' : 'draft',
      group_id: groupId,
      created_by: profile?.id,
    };

    if (builderId) {
      const { data, error } = await supabase.from('quotes').update(payload).eq('id', builderId).select('*, customers(full_name)').single();
      if (!error && data) setQuotes((prev) => prev.map((q) => q.id === data.id ? data : q));
    } else {
      const { data, error } = await supabase.from('quotes').insert(payload as Record<string, unknown>).select('*, customers(full_name)').single();
      if (!error && data) setQuotes([data, ...quotes]);
    }
    setIsBuilderOpen(false);
  };

  const updateQuoteStatus = async (id: string, status: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.from('quotes').update({ status }).eq('id', id).select('*, customers(full_name)').single();
    if (!error && data) {
      setQuotes((prev) => prev.map((q) => q.id === data.id ? data : q));
      if (selectedQuote?.id === id) setSelectedQuote(data);
    }
  };

  const saveAsTemplate = async () => {
    if (!groupId || !newTemplateName.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('quote_templates').insert({
      name: newTemplateName,
      default_items: builderItems,
      group_id: groupId,
    } as Record<string, unknown>).select().single();
    if (!error && data) {
      setTemplates([...templates, data]);
      setNewTemplateName('');
    }
  };

  const deleteQuote = async (id: string) => {
    const supabase = createClient();
    await supabase.from('quotes').delete().eq('id', id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    setSelectedQuote(null);
  };

  const filtered = quotes.filter((q) => {
    if (statusFilter && q.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return q.customers?.full_name?.toLowerCase().includes(s) || q.notes?.toLowerCase().includes(s);
    }
    return true;
  });

  if (isLoading || authLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600 mt-1">Create and manage service quotes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTemplateOpen(true)}>Templates</Button>
          <Button onClick={() => openBuilder()}>
            <Plus className="w-4 h-4 mr-2" /> New Quote
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
          const count = quotes.filter((q) => q.status === key).length;
          return (
            <Card key={key} className={`cursor-pointer ${statusFilter === key ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs font-medium text-gray-500">{conf.label}</p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Quotes List */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
              <p className="text-gray-600">Create your first quote</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((q) => {
                const conf = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
                return (
                  <div key={q.id} className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between" onClick={() => setSelectedQuote(q)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conf.bg} ${conf.color}`}>{conf.label}</span>
                        <span className="text-sm font-medium text-gray-900">{q.customers?.full_name || 'No customer'}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{q.line_items?.length || 0} items &middot; {formatDate(q.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(q.total)}</p>
                      {q.valid_until && <p className="text-xs text-gray-500">Valid until {formatDate(q.valid_until)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Builder Modal */}
      <Modal isOpen={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} title={builderId ? 'Edit Quote' : 'New Quote'} className="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select value={builderCustomer} onChange={(e) => setBuilderCustomer(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <Input label="Valid Until" type="date" value={builderValidUntil} onChange={(e) => setBuilderValidUntil(e.target.value)} />
          </div>

          {/* Templates quick load */}
          {templates.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-gray-500 py-1">Templates:</span>
              {templates.map((t) => (
                <button key={t.id} onClick={() => loadTemplate(t)} className="px-3 py-1 rounded-full text-xs font-medium border hover:bg-blue-50 hover:border-blue-300">{t.name}</button>
              ))}
            </div>
          )}

          {/* Line Items */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Line Items</h4>
            <div className="space-y-2">
              {builderItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {i === 0 && <label className="text-xs text-gray-500">Description</label>}
                    <Input value={item.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} placeholder="Item description" />
                  </div>
                  <div className="w-24">
                    {i === 0 && <label className="text-xs text-gray-500">Type</label>}
                    <select value={item.type} onChange={(e) => updateLineItem(i, 'type', e.target.value)} className="w-full border rounded-lg px-2 py-2 text-sm">
                      <option value="part">Part</option>
                      <option value="labor">Labor</option>
                      <option value="flat_fee">Flat Fee</option>
                    </select>
                  </div>
                  <div className="w-16">
                    {i === 0 && <label className="text-xs text-gray-500">Qty</label>}
                    <Input type="number" value={item.quantity} onChange={(e) => updateLineItem(i, 'quantity', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="w-24">
                    {i === 0 && <label className="text-xs text-gray-500">Unit $</label>}
                    <Input type="number" value={item.unit_price} onChange={(e) => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="w-20 text-right">
                    {i === 0 && <label className="text-xs text-gray-500">Total</label>}
                    <p className="py-2 text-sm font-medium">{formatCurrency(item.quantity * item.unit_price)}</p>
                  </div>
                  <button onClick={() => removeLineItem(i)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addLineItem} className="mt-2 text-sm"><Plus className="w-3 h-3 mr-1" /> Add Item</Button>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Tax (8%)</span><span>{formatCurrency(tax)}</span></div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-500">Discount</span>
              <Input type="number" value={builderDiscount} onChange={(e) => setBuilderDiscount(parseFloat(e.target.value) || 0)} className="w-28 text-right" />
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>

          {/* Notes */}
          <textarea
            value={builderNotes}
            onChange={(e) => setBuilderNotes(e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />

          {/* Save as Template */}
          <div className="flex gap-2 items-center">
            <Input placeholder="Save as template..." value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="flex-1" />
            <Button variant="outline" onClick={saveAsTemplate} disabled={!newTemplateName.trim()}>Save Template</Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => saveQuote(false)}>Save Draft</Button>
            <Button onClick={() => saveQuote(true)}>
              <Send className="w-4 h-4 mr-2" /> Save & Send
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quote Detail Modal */}
      <Modal isOpen={!!selectedQuote} onClose={() => setSelectedQuote(null)} title="Quote Details" className="max-w-2xl">
        {selectedQuote && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedQuote.status]?.bg} ${STATUS_CONFIG[selectedQuote.status]?.color}`}>
                  {STATUS_CONFIG[selectedQuote.status]?.label}
                </span>
                <span className="text-sm text-gray-500">{formatDate(selectedQuote.created_at)}</span>
              </div>
              <div className="flex gap-2">
                {selectedQuote.status === 'draft' && <Button variant="outline" onClick={() => updateQuoteStatus(selectedQuote.id, 'sent')}>Mark Sent</Button>}
                {selectedQuote.status === 'sent' && (
                  <>
                    <Button onClick={() => updateQuoteStatus(selectedQuote.id, 'accepted')}>Accept</Button>
                    <Button variant="outline" onClick={() => updateQuoteStatus(selectedQuote.id, 'declined')}>Decline</Button>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{selectedQuote.customers?.full_name || '-'}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Line Items</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-500"><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {selectedQuote.line_items?.map((item, i) => (
                      <tr key={i} className="border-t"><td className="px-3 py-2">{item.description}</td><td className="px-3 py-2 text-center">{item.type}</td><td className="px-3 py-2 text-center">{item.quantity}</td><td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td><td className="px-3 py-2 text-right">{formatCurrency(item.quantity * item.unit_price)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-right space-y-1">
              <p className="text-sm text-gray-500">Subtotal: {formatCurrency(selectedQuote.subtotal)}</p>
              <p className="text-sm text-gray-500">Tax: {formatCurrency(selectedQuote.tax)}</p>
              {selectedQuote.discount > 0 && <p className="text-sm text-green-600">Discount: -{formatCurrency(selectedQuote.discount)}</p>}
              <p className="text-lg font-bold">Total: {formatCurrency(selectedQuote.total)}</p>
            </div>

            {selectedQuote.notes && <div className="bg-gray-50 rounded-lg p-3 text-sm"><p className="text-gray-500 text-xs mb-1">Notes</p>{selectedQuote.notes}</div>}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => openBuilder(selectedQuote)}>Edit Quote</Button>
              <Button variant="outline" onClick={() => deleteQuote(selectedQuote.id)} className="text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Templates Modal */}
      <Modal isOpen={isTemplateOpen} onClose={() => setIsTemplateOpen(false)} title="Quote Templates">
        <div className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No templates yet. Save one from the quote builder.</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.default_items?.length || 0} items</p>
                </div>
                <Button variant="outline" onClick={() => { loadTemplate(t); openBuilder(); }}>Use</Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
