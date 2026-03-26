'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePathname } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { SUPPLIERS, type SupplierConfig, type SearchResult, buildFallbackLinks } from '@/lib/supplier-search';
import Link from 'next/link';
import {
  Search,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Plus,
  Package,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Store,
} from 'lucide-react';

type SortMode = 'relevance' | 'supplier';

export default function PartsSearchPage() {
  const { groupId } = useAuth();
  const pathname = usePathname();
  const backHref = pathname.startsWith('/admin/tech') ? '/admin/tech/parts' : '/admin/parts-store';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cached, setCached] = useState(false);
  const [fallbackLinks, setFallbackLinks] = useState<{ label: string; url: string }[]>([]);
  const [error, setError] = useState('');

  // Filters
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('relevance');

  // Add to inventory state
  const [addingPart, setAddingPart] = useState<SearchResult | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;

    setIsSearching(true);
    setError('');
    setHasSearched(true);

    try {
      const res = await fetch('/api/parts-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          suppliers: selectedSuppliers.length > 0 ? selectedSuppliers : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Search failed');
        setResults([]);
        setFallbackLinks(buildFallbackLinks(query.trim()));
      } else {
        setResults(data.results || []);
        setTotal(data.total || 0);
        setCached(data.cached || false);
        setFallbackLinks(data.fallback_links || []);
      }
    } catch {
      setError('Network error. Please try again.');
      setFallbackLinks(buildFallbackLinks(query.trim()));
    }

    setIsSearching(false);
  }, [query, selectedSuppliers]);

  const toggleSupplier = (key: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    if (sortMode === 'supplier') {
      return a.supplier.localeCompare(b.supplier) || b.relevance - a.relevance;
    }
    return b.relevance - a.relevance;
  });

  // Group by supplier for supplier view
  const groupedBySupplier = sortedResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.supplier_key;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const handleAddToInventory = async () => {
    if (!addingPart || !groupId) return;
    setAddSubmitting(true);

    try {
      const res = await fetch('/api/parts-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          name: addingPart.name,
          part_number: addingPart.part_number || null,
          category: 'Misc',
          supplier_name: addingPart.supplier,
          supplier_cost: addingPart.price || 0,
          markup_pct: 50,
          in_stock: addingPart.in_stock ?? true,
          notes: addingPart.url ? `Source: ${addingPart.url}` : null,
        }),
      });

      if (res.ok) {
        setAddSuccess(true);
        setTimeout(() => {
          setAddSuccess(false);
          setAddingPart(null);
        }, 1500);
      }
    } catch {
      // silent fail
    }
    setAddSubmitting(false);
  };

  const getSupplierStyle = (key: string): SupplierConfig => {
    return SUPPLIERS.find(s => s.key === key) || { key, name: key, domain: '', color: 'bg-gray-100', textColor: 'text-gray-700' };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={backHref} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search Suppliers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Find parts across 10+ HVAC distributors</p>
        </div>
      </div>

      {/* Search bar (sticky) */}
      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 border-b border-gray-200">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Part number, description, or model (e.g. HN67KC024, TXV R410A 3 ton)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || query.trim().length < 2}
            className="px-5 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>

        {/* Supplier filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 mr-1 flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase">Filter</span>
          </div>
          {SUPPLIERS.map(s => (
            <button
              key={s.key}
              onClick={() => toggleSupplier(s.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedSuppliers.includes(s.key)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.name}
            </button>
          ))}
          {selectedSuppliers.length > 0 && (
            <button
              onClick={() => setSelectedSuppliers([])}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Sort toggle + result count */}
      {hasSearched && results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {results.length} result{results.length !== 1 ? 's' : ''} from {Object.keys(groupedBySupplier).length} supplier{Object.keys(groupedBySupplier).length !== 1 ? 's' : ''}
            {cached && <span className="ml-2 text-xs text-green-600 font-medium">(cached)</span>}
          </p>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setSortMode('relevance')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                sortMode === 'relevance' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              By Relevance
            </button>
            <button
              onClick={() => setSortMode('supplier')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                sortMode === 'supplier' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              By Supplier
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isSearching && (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Searching 10+ suppliers...</p>
          <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Error state */}
      {error && !isSearching && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Results */}
      {!isSearching && hasSearched && (
        <>
          {/* Supplier view */}
          {sortMode === 'supplier' && results.length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedBySupplier).map(([supplierKey, items]) => {
                const style = getSupplierStyle(supplierKey);
                return (
                  <div key={supplierKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <Store className="w-4 h-4 text-gray-400" />
                      <h2 className="text-sm font-bold text-gray-900">{style.name}</h2>
                      <span className="text-xs text-gray-400">({items.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((result, i) => (
                        <ResultCard
                          key={`${supplierKey}-${i}`}
                          result={result}
                          supplierStyle={style}
                          onAddToInventory={() => setAddingPart(result)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Relevance view */}
          {sortMode === 'relevance' && results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedResults.map((result, i) => (
                <ResultCard
                  key={i}
                  result={result}
                  supplierStyle={getSupplierStyle(result.supplier_key)}
                  onAddToInventory={() => setAddingPart(result)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Results Found</h3>
              <p className="text-sm text-gray-500 mb-6">Try these supplier sites directly:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {fallbackLinks.map(link => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {link.label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Initial state */}
      {!hasSearched && !isSearching && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Search HVAC Parts</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Enter a part number, description, or model number to search across Johnstone, URI, Amazon, SupplyHouse, and more.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['HN67KC024', 'TXV R410A 3 ton', '45/5 440V capacitor', 'Carrier contactor'].map(example => (
              <button
                key={example}
                onClick={() => { setQuery(example); }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add to Inventory Modal */}
      {addingPart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={() => setAddingPart(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm p-6" onClick={e => e.stopPropagation()}>
            {addSuccess ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="font-bold text-gray-900">Added to Inventory!</p>
                <p className="text-sm text-gray-500 mt-1">Part is now in your catalog.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Add to Inventory</h2>
                  <button onClick={() => setAddingPart(null)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-900">{addingPart.name}</p>
                    {addingPart.part_number && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{addingPart.part_number}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Supplier</p>
                      <p className="text-sm font-medium text-gray-900">{addingPart.supplier}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Cost</p>
                      <p className="text-sm font-medium text-gray-900">
                        {addingPart.price ? formatCurrency(addingPart.price) : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {addingPart.price && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-700">
                        With 50% markup: <strong>{formatCurrency(addingPart.price * 1.5)}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAddToInventory}
                  disabled={addSubmitting}
                  className="w-full py-3 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {addSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add to Parts Store
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Result Card component
function ResultCard({
  result,
  supplierStyle,
  onAddToInventory,
}: {
  result: SearchResult;
  supplierStyle: SupplierConfig;
  onAddToInventory: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all">
      <div className="p-4">
        {/* Supplier badge */}
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${supplierStyle.color} ${supplierStyle.textColor}`}>
            {supplierStyle.name}
          </span>
          {result.in_stock === true && (
            <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">In Stock</span>
          )}
          {result.in_stock === false && (
            <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Out of Stock</span>
          )}
        </div>

        {/* Product name */}
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1">
          {result.name}
        </h3>

        {/* Part number */}
        {result.part_number && (
          <p className="text-xs text-gray-400 font-mono mb-2">{result.part_number}</p>
        )}

        {/* Price */}
        <div className="mb-3">
          {result.price ? (
            <p className="text-lg font-bold text-gray-900">{formatCurrency(result.price)}</p>
          ) : result.price_text ? (
            <p className="text-sm font-medium text-gray-600">{result.price_text}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Price not listed</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            Buy on {supplierStyle.name.split(' ')[0]}
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onAddToInventory}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            title="Add to Inventory"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
