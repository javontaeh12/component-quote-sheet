'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Modal, Select } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Megaphone,
  Users,
  UserPlus,
  TrendingUp,
  Share2,
  Plus,
  Tag,
  Send,
  Eye,
  Percent,
  DollarSign,
} from 'lucide-react';

interface Promotion {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
}

interface MarketingStats {
  totalCustomers: number;
  newThisMonth: number;
  totalReferrals: number;
  convertedReferrals: number;
  referralRevenue: number;
  activePromotions: number;
}

interface Referral {
  id: string;
  referred_email: string;
  status: string;
  reward_amount: number | null;
  created_at: string;
  customers?: { full_name: string } | null;
}

const SEGMENT_OPTIONS = [
  { value: '', label: 'Select Segment' },
  { value: 'all', label: 'All Customers' },
  { value: 'new', label: 'New Customers (30 days)' },
  { value: 'repeat', label: 'Repeat Customers' },
  { value: 'inactive', label: 'Inactive (90+ days)' },
];

export default function MarketingPage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<MarketingStats>({
    totalCustomers: 0,
    newThisMonth: 0,
    totalReferrals: 0,
    convertedReferrals: 0,
    referralRevenue: 0,
    activePromotions: 0,
  });
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  const [newPromo, setNewPromo] = useState({
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    start_date: '',
    end_date: '',
    active: true,
  });

  const [emailBlast, setEmailBlast] = useState({
    segment: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    if (!authLoading) fetchAll();
  }, [authLoading]);

  const fetchAll = async () => {
    if (!groupId) return;
    try {
      const supabase = createClient();

      const [customersResult, promotionsResult, referralsResult] = await Promise.all([
        supabase.from('customers').select('id, created_at').eq('group_id', groupId),
        supabase.from('promotions').select('*').eq('group_id', groupId).order('created_at', { ascending: false }),
        supabase.from('referrals').select('*, customers:referrer_id(full_name)').eq('group_id', groupId).order('created_at', { ascending: false }),
      ]);

      const customers = customersResult.data || [];
      const promos = promotionsResult.data || [];
      const refs = referralsResult.data || [];

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const newThisMonth = customers.filter((c) => c.created_at >= monthStart).length;
      const converted = refs.filter((r) => r.status === 'converted');

      setStats({
        totalCustomers: customers.length,
        newThisMonth,
        totalReferrals: refs.length,
        convertedReferrals: converted.length,
        referralRevenue: converted.reduce((sum, r) => sum + (r.reward_amount || 0), 0),
        activePromotions: promos.filter((p) => p.active).length,
      });

      setPromotions(promos);
      setReferrals(refs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('promotions')
        .insert({ ...newPromo, group_id: groupId })
        .select()
        .single();

      if (error) throw error;
      setPromotions([data, ...promotions]);
      setIsPromoOpen(false);
      setNewPromo({
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        start_date: '',
        end_date: '',
        active: true,
      });
    } catch (err) {
      console.error('Failed to create promotion:', err);
    }
  };

  const handleTogglePromo = async (id: string, active: boolean) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('promotions')
        .update({ active: !active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setPromotions(promotions.map((p) => (p.id === id ? data : p)));
    } catch (err) {
      console.error('Failed to toggle promotion:', err);
    }
  };

  const retentionRate = stats.totalCustomers > 0
    ? Math.round(((stats.totalCustomers - stats.newThisMonth) / stats.totalCustomers) * 100)
    : 0;

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
        <p className="text-red-800 font-medium">Failed to load marketing data</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
        <p className="text-gray-600 mt-1">Promotions, customer segments, and outreach</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
              <div className="bg-blue-500 p-2 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
              </div>
              <div className="bg-green-500 p-2 rounded-lg">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Retention Rate</p>
                <p className="text-2xl font-bold text-gray-900">{retentionRate}%</p>
              </div>
              <div className="bg-purple-500 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Active Promos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activePromotions}</p>
              </div>
              <div className="bg-orange-500 p-2 rounded-lg">
                <Tag className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Promotions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-500" />
                Promotions
              </CardTitle>
              <Button size="sm" onClick={() => setIsPromoOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {promotions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No promotions yet</p>
            ) : (
              <div className="space-y-3">
                {promotions.map((promo) => (
                  <div key={promo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{promo.name}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          promo.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {promo.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {promo.discount_type === 'percentage'
                          ? `${promo.discount_value}% off`
                          : formatCurrency(promo.discount_value) + ' off'}
                        {' | '}
                        {formatDate(promo.start_date)} - {formatDate(promo.end_date)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={promo.active ? 'outline' : 'primary'}
                      onClick={() => handleTogglePromo(promo.id, promo.active)}
                    >
                      {promo.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Blast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Email Blast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Select
                label="Customer Segment"
                options={SEGMENT_OPTIONS}
                value={emailBlast.segment}
                onChange={(e) => setEmailBlast({ ...emailBlast, segment: e.target.value })}
              />
              <Input
                label="Subject"
                placeholder="Your special offer awaits!"
                value={emailBlast.subject}
                onChange={(e) => setEmailBlast({ ...emailBlast, subject: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={4}
                  placeholder="Write your message here..."
                  value={emailBlast.message}
                  onChange={(e) => setEmailBlast({ ...emailBlast, message: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmailOpen(true)}
                  disabled={!emailBlast.subject || !emailBlast.message}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  disabled={!emailBlast.segment || !emailBlast.subject || !emailBlast.message}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Send Blast
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Program Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{stats.totalReferrals}</p>
              <p className="text-sm text-blue-600">Total Referrals</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{stats.convertedReferrals}</p>
              <p className="text-sm text-green-600">Converted</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.referralRevenue)}</p>
              <p className="text-sm text-purple-600">Revenue from Referrals</p>
            </div>
          </div>

          {referrals.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Recent Referrals</h4>
              {referrals.slice(0, 5).map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium text-gray-900">
                      {ref.customers?.full_name || 'Unknown'}
                    </span>
                    <span className="text-gray-500 ml-2">referred {ref.referred_email}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    ref.status === 'converted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {ref.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Promotion Modal */}
      <Modal isOpen={isPromoOpen} onClose={() => setIsPromoOpen(false)} title="New Promotion">
        <form onSubmit={handleAddPromotion} className="space-y-4">
          <Input
            label="Promotion Name"
            placeholder="Summer Special"
            value={newPromo.name}
            onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
              placeholder="Describe the promotion..."
              value={newPromo.description}
              onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Discount Type"
              options={[
                { value: 'percentage', label: 'Percentage (%)' },
                { value: 'fixed', label: 'Fixed ($)' },
              ]}
              value={newPromo.discount_type}
              onChange={(e) => setNewPromo({ ...newPromo, discount_type: e.target.value as 'percentage' | 'fixed' })}
            />
            <Input
              label="Discount Value"
              type="number"
              min="0"
              step={newPromo.discount_type === 'percentage' ? '1' : '0.01'}
              value={newPromo.discount_value || ''}
              onChange={(e) => setNewPromo({ ...newPromo, discount_value: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={newPromo.start_date}
              onChange={(e) => setNewPromo({ ...newPromo, start_date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={newPromo.end_date}
              onChange={(e) => setNewPromo({ ...newPromo, end_date: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsPromoOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Promotion</Button>
          </div>
        </form>
      </Modal>

      {/* Email Preview Modal */}
      <Modal isOpen={isEmailOpen} onClose={() => setIsEmailOpen(false)} title="Email Preview">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">To: {emailBlast.segment || 'Select segment'}</p>
            <p className="text-sm text-gray-500">Subject: {emailBlast.subject}</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-gray-900 whitespace-pre-wrap">{emailBlast.message}</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEmailOpen(false)}>
              Close
            </Button>
            <Button>
              <Send className="w-4 h-4 mr-1" />
              Send
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
