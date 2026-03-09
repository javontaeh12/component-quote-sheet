'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePathname } from 'next/navigation';
import { PARTS_DATABASE } from '@/lib/parts-data';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  Search,
  Plus,
  Package,
  ShoppingBag,
  Upload,
  Settings,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  X,
  Loader2,
  DollarSign,
  Tag,
  Store,
  Filter,
  Grid3X3,
  List,
  Edit2,
  Trash2,
  ChevronDown,
  AlertCircle,
  Cpu,
  Camera,
} from 'lucide-react';

interface SupplierPart {
  id: string;
  group_id: string;
  name: string;
  part_number: string | null;
  category: string;
  supplier_name: string;
  supplier_cost: number;
  markup_pct: number;
  retail_price: number;
  image_url: string | null;
  in_stock: boolean;
  notes: string | null;
  created_at: string;
}

interface MarkupRule {
  id: string;
  group_id: string;
  category: string;
  default_markup_pct: number;
}

const CATEGORIES = [
  'All', 'Capacitors', 'Copper Fittings', 'PVC Fittings', 'Driers', 'Fuses',
  'Contactors', 'Motors', 'Refrigerants', 'Relays', 'Pressure Controls',
  'Thermostats', 'Electrical', 'Wire', 'Ice Machine', 'True Parts', 'Valves',
  'Pumps', 'Chemicals', 'Hardware', 'Soldering', 'Tape', 'Access Tubes',
  'Batteries', 'Belts', 'Drain', 'Gases', 'Ignition', 'Sensors',
  'Shop Supplies', 'Switches', 'Time Delays', 'Transformers', 'Misc',
];

const SUPPLIERS = ['Johnstone Supply', 'United Refrigeration', 'Amazon', 'Ferguson', 'HD Supply', 'Carrier Enterprise', 'Lennox', 'Other'];

export default function PartsStorePage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const lookupHref = pathname.startsWith('/admin/tech') ? '/admin/tech/parts/lookup' : '/admin/parts-store/lookup';
  const scanHref = pathname.startsWith('/admin/tech') ? '/admin/tech/parts/scan' : '/admin/parts-store/scan';
  const [parts, setParts] = useState<SupplierPart[]>([]);
  const [markupRules, setMarkupRules] = useState<MarkupRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [supplier, setSupplier] = useState('All');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showLoadDefaults, setShowLoadDefaults] = useState(false);
  const [showMarkupSettings, setShowMarkupSettings] = useState(false);
  const [showAddToQuote, setShowAddToQuote] = useState<SupplierPart | null>(null);
  const [editPart, setEditPart] = useState<SupplierPart | null>(null);

  // Add form
  const [addForm, setAddForm] = useState({
    name: '', part_number: '', category: 'Misc', supplier_name: 'Johnstone Supply',
    supplier_cost: '', markup_pct: '50', image_url: '', notes: '', in_stock: true,
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Load defaults state
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [defaultMarkup, setDefaultMarkup] = useState('50');

  // Add to quote state
  const [quoteQty, setQuoteQty] = useState(1);
  const [quoteOption, setQuoteOption] = useState('A');
  const [quoteCopied, setQuoteCopied] = useState(false);

  // Global markup edit
  const [globalMarkup, setGlobalMarkup] = useState('50');

  const fetchParts = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/parts-store?group_id=${groupId}`);
      const data = await res.json();
      if (Array.isArray(data)) setParts(data);
    } catch (err) {
      console.error('Parts fetch error:', err);
    }
    setIsLoading(false);
  }, [groupId]);

  const fetchMarkupRules = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/parts-store/markup?group_id=${groupId}`);
      const data = await res.json();
      if (Array.isArray(data)) setMarkupRules(data);
    } catch (err) {
      console.error('Markup fetch error:', err);
    }
  }, [groupId]);

  useEffect(() => {
    if (!authLoading && groupId) {
      fetchParts();
      fetchMarkupRules();
    }
  }, [authLoading, groupId, fetchParts, fetchMarkupRules]);

  // Filter parts
  const filtered = useMemo(() => {
    let result = parts;
    if (category !== 'All') result = result.filter(p => p.category === category);
    if (supplier !== 'All') result = result.filter(p => p.supplier_name === supplier);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.part_number && p.part_number.toLowerCase().includes(q)) ||
        p.supplier_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [parts, category, supplier, search]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: parts.length };
    parts.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [parts]);

  // Supplier counts
  const supplierCounts = useMemo(() => {
    const counts: Record<string, number> = { All: parts.length };
    parts.forEach(p => { counts[p.supplier_name] = (counts[p.supplier_name] || 0) + 1; });
    return counts;
  }, [parts]);

  // Load defaults from PARTS_DATABASE
  const handleLoadDefaults = async () => {
    if (!groupId) return;
    setLoadingDefaults(true);

    const markup = parseFloat(defaultMarkup) || 50;
    const existingNames = new Set(parts.map(p => p.name.toLowerCase()));
    const newParts = PARTS_DATABASE
      .filter(p => !existingNames.has(p.description.toLowerCase()))
      .map(p => ({
        group_id: groupId,
        name: p.description,
        part_number: p.item,
        category: p.category || 'Misc',
        supplier_name: 'Johnstone Supply',
        supplier_cost: 0,
        markup_pct: markup,
        in_stock: true,
      }));

    if (newParts.length === 0) {
      setLoadingDefaults(false);
      setShowLoadDefaults(false);
      return;
    }

    // Insert in batches of 100 via API route
    for (let i = 0; i < newParts.length; i += 100) {
      const batch = newParts.slice(i, i + 100);
      await fetch('/api/parts-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
    }

    await fetchParts();
    setLoadingDefaults(false);
    setShowLoadDefaults(false);
  };

  // Add part
  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    setAddSubmitting(true);

    const res = await fetch('/api/parts-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: groupId,
        name: addForm.name,
        part_number: addForm.part_number || null,
        category: addForm.category,
        supplier_name: addForm.supplier_name,
        supplier_cost: parseFloat(addForm.supplier_cost) || 0,
        markup_pct: parseFloat(addForm.markup_pct) || 50,
        image_url: addForm.image_url || null,
        notes: addForm.notes || null,
        in_stock: addForm.in_stock,
      }),
    });
    const data = await res.json();

    if (res.ok && Array.isArray(data) && data.length > 0) {
      setParts(prev => [...prev, data[0]]);
      setShowAdd(false);
      setAddForm({
        name: '', part_number: '', category: 'Misc', supplier_name: 'Johnstone Supply',
        supplier_cost: '', markup_pct: '50', image_url: '', notes: '', in_stock: true,
      });
    }
    setAddSubmitting(false);
  };

  // Update part inline
  const handleUpdatePart = async (id: string, updates: Partial<SupplierPart>) => {
    const res = await fetch('/api/parts-store', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await res.json();
    if (res.ok && data?.id) {
      setParts(prev => prev.map(p => p.id === id ? data : p));
    }
  };

  // Delete part
  const handleDeletePart = async (id: string) => {
    const res = await fetch(`/api/parts-store?id=${id}`, { method: 'DELETE' });
    if (res.ok) setParts(prev => prev.filter(p => p.id !== id));
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editPart) return;
    await handleUpdatePart(editPart.id, {
      name: editPart.name,
      part_number: editPart.part_number,
      category: editPart.category,
      supplier_name: editPart.supplier_name,
      supplier_cost: editPart.supplier_cost,
      markup_pct: editPart.markup_pct,
      image_url: editPart.image_url,
      notes: editPart.notes,
      in_stock: editPart.in_stock,
    });
    setEditPart(null);
  };

  // Add to quote — copies to clipboard in quote-ready format
  const handleAddToQuote = () => {
    if (!showAddToQuote) return;
    const part = showAddToQuote;
    const price = part.retail_price || part.supplier_cost * (1 + part.markup_pct / 100);
    const total = price * quoteQty;
    const item = {
      description: part.name,
      category: 'part' as const,
      quantity: quoteQty,
      unit_price: Math.round(price * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
    // Store in localStorage for the ServiceReportBuilder to pick up
    const key = `quote-cart-${quoteOption}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(item);
    localStorage.setItem(key, JSON.stringify(existing));
    setQuoteCopied(true);
    setTimeout(() => {
      setQuoteCopied(false);
      setShowAddToQuote(null);
      setQuoteQty(1);
    }, 1500);
  };

  // Apply global markup to all parts
  const handleApplyGlobalMarkup = async () => {
    if (!groupId) return;
    const markup = parseFloat(globalMarkup);
    if (isNaN(markup)) return;

    // Update each part via API
    await Promise.all(parts.map(p =>
      fetch('/api/parts-store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, markup_pct: markup }),
      })
    ));

    await fetchParts();
    setShowMarkupSettings(false);
  };

  if (isLoading || authLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-12 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{parts.length} parts in catalog</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={scanHref}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <Camera className="w-4 h-4" />
            Scan Tag
          </Link>
          <Link
            href={lookupHref}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Cpu className="w-4 h-4" />
            Parts Lookup
          </Link>
          <button
            onClick={() => setShowMarkupSettings(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Markup
          </button>
          {parts.length === 0 && (
            <button
              onClick={() => setShowLoadDefaults(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Load Parts Catalog
            </button>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Part
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search parts by name or part number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('grid')}
            className={`p-2.5 rounded-lg border transition-colors ${view === 'grid' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-400'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2.5 rounded-lg border transition-colors ${view === 'list' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Supplier filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        <div className="flex items-center gap-1.5 mr-1 flex-shrink-0">
          <Store className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase">Supplier</span>
        </div>
        {['All', ...SUPPLIERS].map(s => (
          <button
            key={s}
            onClick={() => setSupplier(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              supplier === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s} {supplierCounts[s] ? `(${supplierCounts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
        {CATEGORIES.filter(c => c === 'All' || (categoryCounts[c] || 0) > 0).map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              category === c
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c} {categoryCounts[c] ? `(${categoryCounts[c]})` : ''}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {parts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Parts Yet</h3>
          <p className="text-sm text-gray-500 mb-4">Load your HVAC parts catalog to get started.</p>
          <button
            onClick={() => setShowLoadDefaults(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Load {PARTS_DATABASE.length}+ Parts
          </button>
        </div>
      )}

      {/* Parts grid */}
      {filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map(part => {
            const customerPrice = part.retail_price || part.supplier_cost * (1 + part.markup_pct / 100);
            return (
              <div
                key={part.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group"
              >
                {/* Image area */}
                <div className="h-28 sm:h-36 bg-gray-50 flex items-center justify-center relative">
                  {part.image_url ? (
                    <img src={part.image_url} alt={part.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-gray-200" />
                  )}
                  {/* Stock badge */}
                  <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${part.in_stock ? 'bg-green-400' : 'bg-red-400'}`} title={part.in_stock ? 'In Stock' : 'Out of Stock'} />
                  {/* Edit/Delete on hover */}
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setEditPart({ ...part }); }}
                      className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50"
                    >
                      <Edit2 className="w-3 h-3 text-gray-500" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeletePart(part.id); }}
                      className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  {/* Category + supplier */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">{part.category}</span>
                  </div>

                  {/* Name */}
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1">
                    {part.name}
                  </h3>

                  {/* Part number + supplier */}
                  <div className="flex items-center gap-1 mb-2">
                    {part.part_number && (
                      <span className="text-[10px] text-gray-400 font-mono">{part.part_number}</span>
                    )}
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className="text-[10px] text-blue-500 font-medium">{part.supplier_name}</span>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      {part.supplier_cost > 0 ? (
                        <>
                          <p className="text-xs text-gray-400 line-through">{formatCurrency(part.supplier_cost)}</p>
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(customerPrice)}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No cost set</p>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      +{part.markup_pct}%
                    </span>
                  </div>

                  {/* Add to Quote button */}
                  <button
                    onClick={() => setShowAddToQuote(part)}
                    className="w-full py-2 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    Add to Quote Option
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Parts list view */}
      {filtered.length > 0 && view === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Part</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Supplier</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Your Cost</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Stock</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(part => {
                  const customerPrice = part.retail_price || part.supplier_cost * (1 + part.markup_pct / 100);
                  return (
                    <tr key={part.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            {part.image_url ? (
                              <img src={part.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{part.name}</p>
                            {part.part_number && <p className="text-xs text-gray-400 font-mono">{part.part_number}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{part.category}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{part.supplier_name}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">
                        {part.supplier_cost > 0 ? formatCurrency(part.supplier_cost) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                        {part.supplier_cost > 0 ? formatCurrency(customerPrice) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`w-2.5 h-2.5 rounded-full mx-auto ${part.in_stock ? 'bg-green-400' : 'bg-red-400'}`} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setShowAddToQuote(part)}
                            className="px-2.5 py-1 rounded text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            + Quote
                          </button>
                          <button
                            onClick={() => setEditPart({ ...part })}
                            className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && parts.length > 0 && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-500">No parts match your search</p>
        </div>
      )}

      {/* ========== MODALS ========== */}

      {/* Load Defaults Modal */}
      {showLoadDefaults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowLoadDefaults(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Load Parts Catalog</h2>
            <p className="text-sm text-gray-500 mb-4">
              This will import {PARTS_DATABASE.length} HVAC parts from the master catalog.
              You can set costs and markup later.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Markup %</label>
              <input
                type="number"
                value={defaultMarkup}
                onChange={e => setDefaultMarkup(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Applied to all imported parts. You can change per-part later.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLoadDefaults(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleLoadDefaults}
                disabled={loadingDefaults}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingDefaults ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Importing...</span>
                ) : (
                  `Import ${PARTS_DATABASE.length} Parts`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Add Part</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddPart} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Part Name *</label>
                <input type="text" required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 35x440 Oval Run Capacitor" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
                  <input type="text" value={addForm.part_number} onChange={e => setAddForm({ ...addForm, part_number: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="SKU" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select value={addForm.supplier_name} onChange={e => setAddForm({ ...addForm, supplier_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Cost ($)</label>
                  <input type="number" step="0.01" value={addForm.supplier_cost} onChange={e => setAddForm({ ...addForm, supplier_cost: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Markup %</label>
                  <input type="number" step="1" value={addForm.markup_pct} onChange={e => setAddForm({ ...addForm, markup_pct: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              {addForm.supplier_cost && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    Customer Price: <strong>{formatCurrency(parseFloat(addForm.supplier_cost) * (1 + parseFloat(addForm.markup_pct || '50') / 100))}</strong>
                    <span className="text-green-500 text-xs ml-1">({addForm.markup_pct}% markup)</span>
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" value={addForm.image_url} onChange={e => setAddForm({ ...addForm, image_url: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional notes" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={addForm.in_stock} onChange={e => setAddForm({ ...addForm, in_stock: e.target.checked })}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">In Stock</span>
              </label>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={addSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {addSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Part Modal */}
      {editPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditPart(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Edit Part</h2>
              <button onClick={() => setEditPart(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Part Name</label>
                <input type="text" value={editPart.name} onChange={e => setEditPart({ ...editPart, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
                  <input type="text" value={editPart.part_number || ''} onChange={e => setEditPart({ ...editPart, part_number: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={editPart.category} onChange={e => setEditPart({ ...editPart, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select value={editPart.supplier_name} onChange={e => setEditPart({ ...editPart, supplier_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Cost ($)</label>
                  <input type="number" step="0.01" value={editPart.supplier_cost} onChange={e => setEditPart({ ...editPart, supplier_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Markup %</label>
                  <input type="number" step="1" value={editPart.markup_pct} onChange={e => setEditPart({ ...editPart, markup_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              {editPart.supplier_cost > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    Customer Price: <strong>{formatCurrency(editPart.supplier_cost * (1 + editPart.markup_pct / 100))}</strong>
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" value={editPart.image_url || ''} onChange={e => setEditPart({ ...editPart, image_url: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editPart.in_stock} onChange={e => setEditPart({ ...editPart, in_stock: e.target.checked })}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">In Stock</span>
              </label>
              <div className="flex justify-between pt-3 border-t">
                <button onClick={() => { handleDeletePart(editPart.id); setEditPart(null); }} className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
                  Delete
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setEditPart(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Quote Modal */}
      {showAddToQuote && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={() => setShowAddToQuote(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm p-6" onClick={e => e.stopPropagation()}>
            {quoteCopied ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="font-bold text-gray-900">Added to Option {quoteOption}!</p>
                <p className="text-sm text-gray-500 mt-1">Open your Service Report to see it.</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Add to Quote</h2>
                <p className="text-sm text-gray-500 mb-4">{showAddToQuote.name}</p>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Customer Price</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(showAddToQuote.retail_price || showAddToQuote.supplier_cost * (1 + showAddToQuote.markup_pct / 100))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={quoteQty}
                      onChange={e => setQuoteQty(parseInt(e.target.value) || 1)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quote Option</label>
                    <select
                      value={quoteOption}
                      onChange={e => setQuoteOption(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {['A', 'B', 'C', 'D', 'E'].map(o => (
                        <option key={o} value={o}>Option {o}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-700">
                    Line Total: <strong>
                      {formatCurrency((showAddToQuote.retail_price || showAddToQuote.supplier_cost * (1 + showAddToQuote.markup_pct / 100)) * quoteQty)}
                    </strong>
                  </p>
                </div>

                <button
                  onClick={handleAddToQuote}
                  className="w-full py-3 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Add to Option {quoteOption}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Markup Settings Modal */}
      {showMarkupSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowMarkupSettings(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Markup Settings</h2>
              <button onClick={() => setShowMarkupSettings(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Global Markup %</label>
                <input
                  type="number"
                  step="1"
                  value={globalMarkup}
                  onChange={e => setGlobalMarkup(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">This will update the markup on ALL parts in your catalog.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Example with {globalMarkup}% markup</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      A part costing you $100 → customer pays {formatCurrency(100 * (1 + parseFloat(globalMarkup || '50') / 100))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button onClick={() => setShowMarkupSettings(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={handleApplyGlobalMarkup}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Apply to All Parts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
