'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { InventoryTable } from '@/components/InventoryTable';
import { Button, Input, Modal, Select } from '@/components/ui';
import { InventoryItem, Van } from '@/types';
import { PARTS_DATABASE } from '@/lib/parts-data';
import { Plus, Truck, Package, Loader2 } from 'lucide-react';

export default function InventoryPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [selectedVanId, setSelectedVanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVanModalOpen, setIsVanModalOpen] = useState(false);
  const [newVanName, setNewVanName] = useState('');
  const [newVanPlate, setNewVanPlate] = useState('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    const [itemsResult, vansResult] = await Promise.all([
      supabase.from('inventory_items').select('*').order('name'),
      supabase.from('vans').select('*').order('name'),
    ]);

    setItems(itemsResult.data || []);
    setVans(vansResult.data || []);

    // If tech, auto-select their van
    if (profile?.van_id && !isAdmin) {
      setSelectedVanId(profile.van_id);
    }

    setIsLoading(false);
  };

  const handleAddItem = async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(item)
      .select()
      .single();

    if (!error && data) {
      setItems([...items, data]);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('inventory_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setItems(items.map((item) => (item.id === id ? data : item)));
    }
  };

  const handleDeleteItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);

    if (!error) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleAddVan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingStock(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('vans')
      .insert({ name: newVanName, license_plate: newVanPlate || null })
      .select()
      .single();

    if (!error && data) {
      setVans([...vans, data]);
      setNewVanName('');
      setNewVanPlate('');
      setIsVanModalOpen(false);

      // Auto-load all stock parts for the new van
      const inventoryItems = PARTS_DATABASE.map((part) => ({
        van_id: data.id,
        name: part.description,
        description: part.description,
        part_number: part.item,
        quantity: 0,
        min_quantity: 1,
        cost: null,
        vendor: null,
        category: part.category?.toLowerCase().replace(/\s+/g, '-') || 'parts',
      }));

      // Insert in batches of 50
      const batchSize = 50;
      const newItems: InventoryItem[] = [];

      for (let i = 0; i < inventoryItems.length; i += batchSize) {
        const batch = inventoryItems.slice(i, i + batchSize);
        const { data: batchData } = await supabase
          .from('inventory_items')
          .insert(batch)
          .select();

        if (batchData) {
          newItems.push(...batchData);
        }
      }

      setItems([...items, ...newItems]);
      setSelectedVanId(data.id);
    }

    setIsLoadingStock(false);
  };

  // Load all stock parts into a van's inventory
  const handleLoadStockParts = async (vanId: string) => {
    if (!confirm('This will add all 200+ stock parts to this van\'s inventory with 0 quantity. Continue?')) {
      return;
    }

    setIsLoadingStock(true);
    const supabase = createClient();

    // Get existing part numbers for this van to avoid duplicates
    const { data: existingItems } = await supabase
      .from('inventory_items')
      .select('part_number')
      .eq('van_id', vanId);

    const existingPartNumbers = new Set(
      existingItems?.map((item) => item.part_number?.toLowerCase()) || []
    );

    // Filter out parts that already exist
    const newParts = PARTS_DATABASE.filter(
      (part) => !existingPartNumbers.has(part.item.toLowerCase())
    );

    if (newParts.length === 0) {
      alert('All stock parts are already in this van\'s inventory!');
      setIsLoadingStock(false);
      return;
    }

    // Create inventory items for each part
    const inventoryItems = newParts.map((part) => ({
      van_id: vanId,
      name: part.description,
      description: part.description,
      part_number: part.item,
      quantity: 0,
      min_quantity: 1,
      cost: null,
      vendor: null,
      category: part.category?.toLowerCase().replace(/\s+/g, '-') || 'parts',
    }));

    // Insert in batches of 50 to avoid timeouts
    const batchSize = 50;
    const newItems: InventoryItem[] = [];

    for (let i = 0; i < inventoryItems.length; i += batchSize) {
      const batch = inventoryItems.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(batch)
        .select();

      if (error) {
        console.error('Error inserting batch:', error);
        alert('Error adding some parts. Please try again.');
        break;
      }

      if (data) {
        newItems.push(...data);
      }
    }

    setItems([...items, ...newItems]);
    setIsLoadingStock(false);
    alert(`Successfully added ${newItems.length} parts to inventory!`);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-1">Manage your van inventory</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && (
            <>
              <Select
                options={[
                  { value: '', label: 'All Vans' },
                  ...vans.map((v) => ({ value: v.id, label: v.name })),
                ]}
                value={selectedVanId || ''}
                onChange={(e) => setSelectedVanId(e.target.value || null)}
                className="w-40"
              />
              {selectedVanId && (
                <Button
                  variant="outline"
                  onClick={() => handleLoadStockParts(selectedVanId)}
                  disabled={isLoadingStock}
                >
                  {isLoadingStock ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4 mr-2" />
                  )}
                  {isLoadingStock ? 'Loading...' : 'Load Stock Parts'}
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsVanModalOpen(true)}>
                <Truck className="w-4 h-4 mr-2" />
                Add Van
              </Button>
            </>
          )}
        </div>
      </div>

      {vans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Vans Yet</h3>
          <p className="text-gray-600 mb-4">Add a van to start tracking inventory</p>
          {isAdmin && (
            <Button onClick={() => setIsVanModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Van
            </Button>
          )}
        </div>
      ) : (
        <InventoryTable
          items={items}
          vans={vans}
          onAdd={handleAddItem}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          selectedVanId={selectedVanId}
          isAdmin={isAdmin}
        />
      )}

      <Modal
        isOpen={isVanModalOpen}
        onClose={() => setIsVanModalOpen(false)}
        title="Add Van"
      >
        <form onSubmit={handleAddVan} className="space-y-4">
          <Input
            label="Van Name"
            placeholder="e.g., Van 1, Truck A"
            value={newVanName}
            onChange={(e) => setNewVanName(e.target.value)}
            required
          />
          <Input
            label="License Plate (optional)"
            placeholder="e.g., ABC-1234"
            value={newVanPlate}
            onChange={(e) => setNewVanPlate(e.target.value)}
          />
          <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
            All 200+ stock parts will be automatically added to this van&apos;s inventory.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsVanModalOpen(false)} disabled={isLoadingStock}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoadingStock}>
              {isLoadingStock ? 'Adding Van & Parts...' : 'Add Van'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
