'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { InventoryItem, Van, Order } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Download, ShoppingCart, Package, Check, AlertTriangle } from 'lucide-react';

interface LowStockItem extends InventoryItem {
  van_name: string;
  quantity_needed: number;
}

export default function OrdersPage() {
  const { profile } = useAuth();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    const [itemsResult, vansResult, ordersResult] = await Promise.all([
      supabase.from('inventory_items').select('*'),
      supabase.from('vans').select('*'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
    ]);

    const items = itemsResult.data || [];
    const vans = vansResult.data || [];
    const vanMap = new Map(vans.map((v: Van) => [v.id, v.name]));

    const lowStock = items
      .filter((item: InventoryItem) => item.quantity < item.min_quantity)
      .map((item: InventoryItem) => ({
        ...item,
        van_name: vanMap.get(item.van_id) || 'Unknown',
        quantity_needed: item.min_quantity - item.quantity,
      }));

    setLowStockItems(lowStock);
    setOrders(ordersResult.data || []);
    setIsLoading(false);
  };

  const handleExport = async () => {
    setIsExporting(true);

    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: lowStockItems }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `low-stock-order-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    setIsExporting(false);
  };

  const handleCreateOrder = async () => {
    setIsCreatingOrder(true);
    const supabase = createClient();

    const orderItems = lowStockItems.map((item) => ({
      item_id: item.id,
      name: item.name,
      part_number: item.part_number,
      quantity_needed: item.quantity_needed,
      vendor: item.vendor,
      cost: item.cost,
    }));

    const { data, error } = await supabase
      .from('orders')
      .insert({
        created_by: profile?.id,
        items: orderItems,
        status: 'pending',
      })
      .select()
      .single();

    if (!error && data) {
      setOrders([data, ...orders]);
    }

    setIsCreatingOrder(false);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (!error) {
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: status as Order['status'] } : o)));
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Manage low stock items and orders</p>
        </div>
      </div>

      {/* Low Stock Items */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Low Stock Items ({lowStockItems.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              isLoading={isExporting}
              disabled={lowStockItems.length === 0}
              size="sm"
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
            <Button
              onClick={handleCreateOrder}
              isLoading={isCreatingOrder}
              disabled={lowStockItems.length === 0}
              size="sm"
            >
              <ShoppingCart className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Order</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>All items are stocked above minimum levels</p>
            </div>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.van_name}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex-shrink-0 ml-2">
                        {item.quantity} left
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Need</p>
                        <p className="font-medium text-gray-900">+{item.quantity_needed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Vendor</p>
                        <p className="text-gray-600 truncate">{item.vendor || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Est. Cost</p>
                        <p className="text-gray-600">{item.cost ? formatCurrency(item.cost * item.quantity_needed) : '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {lowStockItems.some((i) => i.cost) && (
                  <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300 px-1">
                    <span className="font-medium text-gray-900">Estimated Total:</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(
                        lowStockItems.reduce(
                          (sum, item) => sum + (item.cost || 0) * item.quantity_needed,
                          0
                        )
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Item</th>
                      <th className="pb-3 font-medium">Van</th>
                      <th className="pb-3 font-medium">Part #</th>
                      <th className="pb-3 font-medium">Current</th>
                      <th className="pb-3 font-medium">Needed</th>
                      <th className="pb-3 font-medium">Vendor</th>
                      <th className="pb-3 font-medium">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lowStockItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="py-3 text-gray-600">{item.van_name}</td>
                        <td className="py-3 text-gray-600">{item.part_number || '-'}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3 text-gray-900 font-medium">+{item.quantity_needed}</td>
                        <td className="py-3 text-gray-600">{item.vendor || '-'}</td>
                        <td className="py-3 text-gray-600">
                          {item.cost ? formatCurrency(item.cost * item.quantity_needed) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {lowStockItems.some((i) => i.cost) && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan={6} className="py-3 text-right font-medium text-gray-900">
                          Estimated Total:
                        </td>
                        <td className="py-3 font-bold text-gray-900">
                          {formatCurrency(
                            lowStockItems.reduce(
                              (sum, item) => sum + (item.cost || 0) * item.quantity_needed,
                              0
                            )
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No orders created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : order.status === 'ordered'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateOrderStatus(order.id, 'ordered')}
                        >
                          Mark Ordered
                        </Button>
                      )}
                      {order.status === 'ordered' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateOrderStatus(order.id, 'received')}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Received
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} -{' '}
                    {order.items.map((i) => i.name).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
