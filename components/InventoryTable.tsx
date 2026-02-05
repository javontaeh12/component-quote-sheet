'use client';

import { useState, useRef, useEffect } from 'react';
import { InventoryItem, Van, CustomPart } from '@/types';
import { Button, Input, Modal, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { searchParts, Part, PARTS_DATABASE } from '@/lib/parts-data';
import { createClient } from '@/lib/supabase';
import { Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react';

interface ExtendedPart extends Part {
  isCustom?: boolean;
}

interface InventoryTableProps {
  items: InventoryItem[];
  vans: Van[];
  onAdd: (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdate: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  selectedVanId: string | null;
  isAdmin: boolean;
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'refrigerant', label: 'Refrigerants' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'filters', label: 'Filters' },
  { value: 'tools', label: 'Tools' },
  { value: 'parts', label: 'Parts' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== '');

export function InventoryTable({
  items,
  vans,
  onAdd,
  onUpdate,
  onDelete,
  selectedVanId,
  isAdmin,
}: InventoryTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    part_number: '',
    quantity: 0,
    min_quantity: 1,
    cost: '',
    vendor: '',
    category: 'parts',
    van_id: selectedVanId || '',
  });

  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<ExtendedPart[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [customParts, setCustomParts] = useState<CustomPart[]>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Fetch custom parts on mount
  useEffect(() => {
    const fetchCustomParts = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('custom_parts')
        .select('*')
        .order('item');
      if (data) {
        setCustomParts(data);
      }
    };
    fetchCustomParts();
  }, []);

  // Handle click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search both stock and custom parts
  const searchAllParts = (query: string): ExtendedPart[] => {
    if (!query || query.length < 1) return [];
    const lowerQuery = query.toLowerCase();

    // Search stock parts
    const stockResults = PARTS_DATABASE.filter(
      (p) =>
        p.item.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
    ).map((p) => ({ ...p, isCustom: false }));

    // Search custom parts
    const customResults = customParts
      .filter(
        (p) =>
          p.item.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery)
      )
      .map((p) => ({
        item: p.item,
        description: p.description,
        category: p.category || undefined,
        isCustom: true,
      }));

    // Custom parts first, then stock parts
    return [...customResults, ...stockResults].slice(0, 10);
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    const results = searchAllParts(value);
    setAutocompleteResults(results);
    setShowAutocomplete(results.length > 0);
    setSelectedIndex(-1);
  };

  const handleSelectPart = (part: ExtendedPart) => {
    setFormData({
      ...formData,
      name: part.description,
      part_number: part.item,
      description: part.description,
    });
    setShowAutocomplete(false);
    setAutocompleteResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete || autocompleteResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, autocompleteResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectPart(autocompleteResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesVan = !selectedVanId || item.van_id === selectedVanId;
    return matchesSearch && matchesCategory && matchesVan;
  });

  const handleOpenModal = (item?: InventoryItem) => {
    // Reset autocomplete state
    setAutocompleteResults([]);
    setShowAutocomplete(false);
    setSelectedIndex(-1);

    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        part_number: item.part_number || '',
        quantity: item.quantity,
        min_quantity: item.min_quantity,
        cost: item.cost?.toString() || '',
        vendor: item.vendor || '',
        category: item.category || 'parts',
        van_id: item.van_id,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        part_number: '',
        quantity: 0,
        min_quantity: 1,
        cost: '',
        vendor: '',
        category: 'parts',
        van_id: selectedVanId || vans[0]?.id || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const itemData = {
      name: formData.name,
      description: formData.description || null,
      part_number: formData.part_number || null,
      quantity: formData.quantity,
      min_quantity: formData.min_quantity,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      vendor: formData.vendor || null,
      category: formData.category || null,
      van_id: formData.van_id,
    };

    if (editingItem) {
      await onUpdate(editingItem.id, itemData);
    } else {
      await onAdd(itemData);
    }

    setIsLoading(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await onDelete(id);
    }
  };

  const vanMap = new Map(vans.map((v) => [v.id, v.name]));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select
            options={CATEGORIES}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-8 text-center text-gray-500">
            No items found
          </div>
        ) : (
          filteredItems.map((item) => {
            const isLowStock = item.quantity < item.min_quantity;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-sm border p-4 ${
                  isLowStock ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isLowStock && <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      {item.part_number && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.part_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="p-2 text-gray-400 hover:text-blue-600 active:text-blue-700 transition-colors rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 active:text-red-700 transition-colors rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">On Hand</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        isLowStock
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {item.quantity}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Min</p>
                    <p className="font-medium text-gray-900 mt-1">{item.min_quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cost</p>
                    <p className="font-medium text-gray-900 mt-1">{formatCurrency(item.cost)}</p>
                  </div>
                </div>
                {(isAdmin && !selectedVanId || item.vendor) && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    {isAdmin && !selectedVanId && (
                      <span>Van: {vanMap.get(item.van_id) || 'Unknown'}</span>
                    )}
                    {item.vendor && <span>Vendor: {item.vendor}</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Item</th>
                {isAdmin && !selectedVanId && <th className="px-4 py-3 font-medium">Van</th>}
                <th className="px-4 py-3 font-medium">Part #</th>
                <th className="px-4 py-3 font-medium">On Hand</th>
                <th className="px-4 py-3 font-medium">Min</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin && !selectedVanId ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLowStock = item.quantity < item.min_quantity;
                  return (
                    <tr key={item.id} className={isLowStock ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLowStock && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {isAdmin && !selectedVanId && (
                        <td className="px-4 py-3 text-gray-600">
                          {vanMap.get(item.van_id) || 'Unknown'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-600">{item.part_number || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isLowStock
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.min_quantity}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(item.cost)}</td>
                      <td className="px-4 py-3 text-gray-600">{item.vendor || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Item Name with Autocomplete */}
            <div className="sm:col-span-2 relative" ref={autocompleteRef}>
              <Input
                label="Item Name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (autocompleteResults.length > 0) setShowAutocomplete(true);
                }}
                placeholder="Start typing to search parts..."
                required
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-1">Type to search from 200+ parts</p>
              {showAutocomplete && autocompleteResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {autocompleteResults.map((part, index) => (
                    <div
                      key={`${part.item}-${part.isCustom ? 'custom' : 'stock'}`}
                      onClick={() => handleSelectPart(part)}
                      className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-sm text-blue-700 flex items-center gap-2">
                        {part.item}
                        {part.isCustom && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700">{part.description}</div>
                      {part.category && (
                        <div className="text-xs text-gray-400 mt-1">{part.category}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input
              label="Part Number"
              value={formData.part_number}
              onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
              placeholder="Auto-fills when part selected"
            />
            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            {isAdmin && (
              <Select
                label="Van"
                options={vans.map((v) => ({ value: v.id, label: v.name }))}
                value={formData.van_id}
                onChange={(e) => setFormData({ ...formData, van_id: e.target.value })}
                className="sm:col-span-2"
              />
            )}
            <Input
              label="On Hand"
              type="number"
              min={0}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              required
            />
            <Input
              label="Minimum Quantity"
              type="number"
              min={0}
              value={formData.min_quantity}
              onChange={(e) =>
                setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 1 })
              }
              required
            />
            <Input
              label="Cost"
              type="number"
              step="0.01"
              min={0}
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
            <Input
              label="Vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="sm:col-span-2"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingItem ? 'Update' : 'Add'} Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
