'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Modal } from '@/components/ui';
import Link from 'next/link';
import {
  Truck,
  Gauge,
  Fuel,
  Wrench,
  Package,
  Plus,
  AlertTriangle,
  Calendar,
  MapPin,
  ExternalLink,
} from 'lucide-react';

type Tab = 'inventory' | 'mileage' | 'gas' | 'maintenance';

interface MileageLog {
  id: string;
  van_id: string;
  date: string;
  start_miles: number;
  end_miles: number;
  total_miles: number;
  notes: string | null;
  created_at: string;
}

interface GasLog {
  id: string;
  van_id: string;
  date: string;
  gallons: number;
  price_per_gallon: number;
  total_cost: number;
  odometer: number | null;
  station: string | null;
  created_at: string;
}

interface MaintenanceLog {
  id: string;
  van_id: string;
  date: string;
  type: string;
  description: string | null;
  cost: number | null;
  vendor: string | null;
  next_due_date: string | null;
  next_due_miles: number | null;
  created_at: string;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function TruckPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('mileage');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Mileage state
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [mileageLoading, setMileageLoading] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);

  // Gas state
  const [gasLogs, setGasLogs] = useState<GasLog[]>([]);
  const [gasLoading, setGasLoading] = useState(false);
  const [showGasModal, setShowGasModal] = useState(false);

  // Maintenance state
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<MaintenanceLog[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vanId = profile?.van_id;

  const fetchMileage = useCallback(async () => {
    setMileageLoading(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (vanId) params.set('van_id', vanId);
      const res = await fetch(`/api/truck/mileage?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setMileageLogs(await res.json());
    } catch {
      setError('Failed to load mileage logs');
    } finally {
      setMileageLoading(false);
    }
  }, [selectedMonth, vanId]);

  const fetchGas = useCallback(async () => {
    setGasLoading(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (vanId) params.set('van_id', vanId);
      const res = await fetch(`/api/truck/gas?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setGasLogs(await res.json());
    } catch {
      setError('Failed to load gas logs');
    } finally {
      setGasLoading(false);
    }
  }, [selectedMonth, vanId]);

  const fetchMaintenance = useCallback(async () => {
    setMaintenanceLoading(true);
    try {
      const params = new URLSearchParams();
      if (vanId) params.set('van_id', vanId);
      const [logsRes, upcomingRes] = await Promise.all([
        fetch(`/api/truck/maintenance?${params}`),
        fetch(`/api/truck/maintenance?upcoming=true&${params}`),
      ]);
      if (!logsRes.ok || !upcomingRes.ok) throw new Error('Failed to fetch');
      setMaintenanceLogs(await logsRes.json());
      setUpcomingMaintenance(await upcomingRes.json());
    } catch {
      setError('Failed to load maintenance logs');
    } finally {
      setMaintenanceLoading(false);
    }
  }, [vanId]);

  useEffect(() => {
    if (activeTab === 'mileage') fetchMileage();
    else if (activeTab === 'gas') fetchGas();
    else if (activeTab === 'maintenance') fetchMaintenance();
  }, [activeTab, fetchMileage, fetchGas, fetchMaintenance]);

  // Mileage summary
  const totalMilesThisMonth = mileageLogs.reduce((sum, l) => sum + (l.total_miles || 0), 0);
  const avgDailyMiles = mileageLogs.length > 0 ? totalMilesThisMonth / mileageLogs.length : 0;

  // Gas summary
  const totalGasCost = gasLogs.reduce((sum, l) => sum + (l.total_cost || 0), 0);
  const totalGallons = gasLogs.reduce((sum, l) => sum + (l.gallons || 0), 0);
  const avgPricePerGallon = gasLogs.length > 0
    ? gasLogs.reduce((sum, l) => sum + (l.price_per_gallon || 0), 0) / gasLogs.length
    : 0;

  // Maintenance summary
  const totalMaintenanceCost = maintenanceLogs.reduce((sum, l) => sum + (l.cost || 0), 0);
  const upcomingCount = upcomingMaintenance.length;

  const tabs = [
    { id: 'inventory' as Tab, label: 'Inventory', icon: Package },
    { id: 'mileage' as Tab, label: 'Mileage', icon: Gauge },
    { id: 'gas' as Tab, label: 'Gas', icon: Fuel },
    { id: 'maintenance' as Tab, label: 'Maintenance', icon: Wrench },
  ];

  async function handleMileageSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/truck/mileage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.get('date'),
          start_miles: form.get('start_miles'),
          end_miles: form.get('end_miles'),
          notes: form.get('notes') || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setShowMileageModal(false);
      fetchMileage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mileage');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGasSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/truck/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.get('date'),
          gallons: form.get('gallons'),
          price_per_gallon: form.get('price_per_gallon'),
          odometer: form.get('odometer') || null,
          station: form.get('station') || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setShowGasModal(false);
      fetchGas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gas log');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMaintenanceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/truck/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.get('date'),
          type: form.get('type'),
          description: form.get('description') || null,
          cost: form.get('cost') || null,
          vendor: form.get('vendor') || null,
          next_due_date: form.get('next_due_date') || null,
          next_due_miles: form.get('next_due_miles') || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setShowMaintenanceModal(false);
      fetchMaintenance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save maintenance log');
    } finally {
      setSubmitting(false);
    }
  }

  const isLoading = mileageLoading || gasLoading || maintenanceLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6" />
            Truck Management
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">Track mileage, gas, and maintenance</p>
        </div>
        <a
          href="https://www.bouncie.com/my-car"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
          GPS Tracking
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Month selector for mileage and gas */}
      {(activeTab === 'mileage' || activeTab === 'gas') && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-black"
          />
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Van Inventory</h3>
              <p className="text-gray-600 mb-4">Manage your truck parts and supplies inventory</p>
              <Link href="/admin/inventory">
                <Button>Go to Inventory</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mileage Tab */}
      {activeTab === 'mileage' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500">Total Miles</p>
                <p className="text-2xl font-bold text-gray-900">{totalMilesThisMonth.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500">Avg Daily Miles</p>
                <p className="text-2xl font-bold text-gray-900">{avgDailyMiles.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500">Entries</p>
                <p className="text-2xl font-bold text-gray-900">{mileageLogs.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mileage Log</CardTitle>
                <Button size="sm" onClick={() => setShowMileageModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mileageLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : mileageLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No mileage entries for this month</p>
              ) : (
                <>
                  {/* Mobile card layout */}
                  <div className="sm:hidden space-y-3">
                    {mileageLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm text-gray-900">{formatDate(log.date)}</p>
                          <span className="text-sm font-bold text-blue-600">{log.total_miles?.toFixed(1)} mi</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {log.start_miles} - {log.end_miles}
                        </p>
                        {log.notes && <p className="text-xs text-gray-400 mt-1">{log.notes}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 border-b">
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Start</th>
                          <th className="pb-3 font-medium">End</th>
                          <th className="pb-3 font-medium">Total</th>
                          <th className="pb-3 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mileageLogs.map((log) => (
                          <tr key={log.id} className="border-b last:border-0">
                            <td className="py-3 text-gray-900">{formatDate(log.date)}</td>
                            <td className="py-3 text-gray-600">{log.start_miles}</td>
                            <td className="py-3 text-gray-600">{log.end_miles}</td>
                            <td className="py-3 font-medium text-blue-600">{log.total_miles?.toFixed(1)}</td>
                            <td className="py-3 text-gray-500 text-sm">{log.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Modal isOpen={showMileageModal} onClose={() => setShowMileageModal(false)} title="Add Mileage Entry">
            <form onSubmit={handleMileageSubmit} className="space-y-4">
              <Input
                label="Date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
              <Input label="Start Miles" name="start_miles" type="number" step="0.1" required placeholder="e.g. 45000" />
              <Input label="End Miles" name="end_miles" type="number" step="0.1" required placeholder="e.g. 45150" />
              <Input label="Notes (optional)" name="notes" placeholder="Route details, etc." />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowMileageModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Save
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}

      {/* Gas Tab */}
      {activeTab === 'gas' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500">Total Gas Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalGasCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500">Total Gallons</p>
                <p className="text-2xl font-bold text-gray-900">{totalGallons.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500">Avg $/Gallon</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgPricePerGallon)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gas Log</CardTitle>
                <Button size="sm" onClick={() => setShowGasModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {gasLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : gasLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No gas entries for this month</p>
              ) : (
                <>
                  {/* Mobile card layout */}
                  <div className="sm:hidden space-y-3">
                    {gasLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm text-gray-900">{formatDate(log.date)}</p>
                          <span className="text-sm font-bold text-green-600">{formatCurrency(log.total_cost)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {log.gallons} gal @ {formatCurrency(log.price_per_gallon)}/gal
                        </p>
                        {log.station && <p className="text-xs text-gray-400 mt-1">{log.station}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 border-b">
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Gallons</th>
                          <th className="pb-3 font-medium">$/Gallon</th>
                          <th className="pb-3 font-medium">Total</th>
                          <th className="pb-3 font-medium">Station</th>
                          <th className="pb-3 font-medium">Odometer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gasLogs.map((log) => (
                          <tr key={log.id} className="border-b last:border-0">
                            <td className="py-3 text-gray-900">{formatDate(log.date)}</td>
                            <td className="py-3 text-gray-600">{log.gallons}</td>
                            <td className="py-3 text-gray-600">{formatCurrency(log.price_per_gallon)}</td>
                            <td className="py-3 font-medium text-green-600">{formatCurrency(log.total_cost)}</td>
                            <td className="py-3 text-gray-500 text-sm">{log.station || '-'}</td>
                            <td className="py-3 text-gray-500 text-sm">{log.odometer || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Modal isOpen={showGasModal} onClose={() => setShowGasModal(false)} title="Add Gas Entry">
            <form onSubmit={handleGasSubmit} className="space-y-4">
              <Input
                label="Date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
              <Input label="Gallons" name="gallons" type="number" step="0.001" required placeholder="e.g. 15.5" />
              <Input label="Price per Gallon" name="price_per_gallon" type="number" step="0.001" required placeholder="e.g. 3.459" />
              <Input label="Odometer (optional)" name="odometer" type="number" step="0.1" placeholder="e.g. 45150" />
              <Input label="Station (optional)" name="station" placeholder="e.g. Shell on Main St" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowGasModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Save
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500">Total Maintenance Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalMaintenanceCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500">Service Records</p>
                <p className="text-2xl font-bold text-gray-900">{maintenanceLogs.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500">Upcoming</p>
                <p className={`text-2xl font-bold ${upcomingCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {upcomingCount}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Maintenance Alerts */}
          {upcomingMaintenance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Upcoming Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingMaintenance.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{log.type}</p>
                        <p className="text-xs text-gray-500">
                          {log.description && `${log.description} - `}
                          Due: {log.next_due_date ? formatDate(log.next_due_date) : `${log.next_due_miles} miles`}
                        </p>
                      </div>
                      <Calendar className="w-4 h-4 text-orange-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Maintenance History</CardTitle>
                <Button size="sm" onClick={() => setShowMaintenanceModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {maintenanceLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : maintenanceLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No maintenance records</p>
              ) : (
                <>
                  {/* Mobile card layout */}
                  <div className="sm:hidden space-y-3">
                    {maintenanceLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{log.type}</p>
                            <p className="text-xs text-gray-500">{formatDate(log.date)}</p>
                          </div>
                          {log.cost != null && (
                            <span className="text-sm font-bold text-red-600">{formatCurrency(log.cost)}</span>
                          )}
                        </div>
                        {log.description && <p className="text-xs text-gray-500 mt-1">{log.description}</p>}
                        {log.vendor && <p className="text-xs text-gray-400 mt-1">{log.vendor}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 border-b">
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Type</th>
                          <th className="pb-3 font-medium">Description</th>
                          <th className="pb-3 font-medium">Cost</th>
                          <th className="pb-3 font-medium">Vendor</th>
                          <th className="pb-3 font-medium">Next Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maintenanceLogs.map((log) => (
                          <tr key={log.id} className="border-b last:border-0">
                            <td className="py-3 text-gray-900">{formatDate(log.date)}</td>
                            <td className="py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {log.type}
                              </span>
                            </td>
                            <td className="py-3 text-gray-600 text-sm">{log.description || '-'}</td>
                            <td className="py-3 font-medium text-red-600">
                              {log.cost != null ? formatCurrency(log.cost) : '-'}
                            </td>
                            <td className="py-3 text-gray-500 text-sm">{log.vendor || '-'}</td>
                            <td className="py-3 text-gray-500 text-sm">
                              {log.next_due_date ? formatDate(log.next_due_date) : log.next_due_miles ? `${log.next_due_miles} mi` : '-'}
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

          <Modal
            isOpen={showMaintenanceModal}
            onClose={() => setShowMaintenanceModal(false)}
            title="Add Maintenance Entry"
            className="max-w-xl"
          >
            <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
              <Input
                label="Date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
              <Select
                label="Type"
                name="type"
                required
                options={[
                  { value: '', label: 'Select type...' },
                  { value: 'Oil Change', label: 'Oil Change' },
                  { value: 'Tire Rotation', label: 'Tire Rotation' },
                  { value: 'Brake Service', label: 'Brake Service' },
                  { value: 'Transmission', label: 'Transmission' },
                  { value: 'AC Service', label: 'AC Service' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <Input label="Description (optional)" name="description" placeholder="Details about the service" />
              <Input label="Cost (optional)" name="cost" type="number" step="0.01" placeholder="e.g. 75.00" />
              <Input label="Vendor (optional)" name="vendor" placeholder="e.g. Jiffy Lube" />
              <Input label="Next Due Date (optional)" name="next_due_date" type="date" />
              <Input label="Next Due Miles (optional)" name="next_due_miles" type="number" step="0.1" placeholder="e.g. 50000" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowMaintenanceModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Save
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
