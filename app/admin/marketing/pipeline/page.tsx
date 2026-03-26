'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Lightbulb,
  FileText,
  Palette,
  GitBranch,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Clock,
  AlertCircle,
  Circle,
  Eye,
} from 'lucide-react';
import ContentDetail from '@/components/marketing/ContentDetail';

interface PipelineStage {
  key: string;
  name: string;
  day: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface StageStatus {
  count: number;
  lastRun: string | null;
  status: 'idle' | 'complete' | 'error';
}

interface ContentItem {
  id: string;
  status: string;
  platform: string;
  content_type: string;
  headline: string | null;
  variant_label: string | null;
  created_at: string;
  updated_at: string;
  scheduled_date: string | null;
  image_url: string | null;
  image_prompt: string | null;
  marketing_campaigns?: { name: string } | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  campaign_type: string;
  created_at: string;
}

const STAGES: PipelineStage[] = [
  { key: 'strategy', name: 'Strategy', day: 'Monday', icon: <Lightbulb className="w-6 h-6" />, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  { key: 'content', name: 'Content', day: 'Tuesday', icon: <FileText className="w-6 h-6" />, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  { key: 'creative', name: 'Creative', day: 'Wednesday', icon: <Palette className="w-6 h-6" />, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  { key: 'variants', name: 'A/B Test', day: 'Thursday', icon: <GitBranch className="w-6 h-6" />, color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200' },
  { key: 'validate', name: 'Validate', day: 'Friday', icon: <ShieldCheck className="w-6 h-6" />, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
  { key: 'review', name: 'Your Review', day: 'Anytime', icon: <CheckCircle className="w-6 h-6" />, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-200' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-purple-100 text-purple-700',
};

export default function PipelinePage() {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();

  const stageLinks: Record<string, string> = {
    strategy: '/admin/marketing?tab=campaigns',
    content: '/admin/marketing?tab=calendar',
    creative: '/admin/marketing?tab=calendar',
    variants: '/admin/marketing?tab=calendar',
    validate: '/admin/marketing?tab=review',
    review: '/admin/marketing?tab=review',
  };
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const fetchData = async () => {
    try {
      const [campRes, contentRes] = await Promise.all([
        fetch('/api/marketing/campaigns'),
        fetch('/api/marketing/content'),
      ]);
      const campData = await campRes.json();
      const contentData = await contentRes.json();
      setCampaigns(Array.isArray(campData) ? campData : []);
      setContent(Array.isArray(contentData) ? contentData : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Calculate stage statuses
  const getStageStatuses = (): Record<string, StageStatus> => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...

    const draftCount = content.filter(c => c.status === 'draft' && !c.headline).length;
    const withCopy = content.filter(c => c.status === 'draft' && c.headline && !c.image_prompt).length;
    const withCreative = content.filter(c => c.image_prompt && c.status === 'draft').length;
    const variantCount = content.filter(c => c.variant_label === 'B').length;
    const pendingCount = content.filter(c => c.status === 'pending_review').length;
    const approvedCount = content.filter(c => c.status === 'approved').length;

    return {
      strategy: {
        count: campaigns.length,
        lastRun: campaigns.length > 0 ? campaigns[0].created_at : null,
        status: dayOfWeek >= 1 && campaigns.length > 0 ? 'complete' : 'idle',
      },
      content: {
        count: content.filter(c => c.headline).length,
        lastRun: content.length > 0 ? content[0].created_at : null,
        status: dayOfWeek >= 2 && content.filter(c => c.headline).length > 0 ? 'complete' : 'idle',
      },
      creative: {
        count: content.filter(c => c.image_prompt).length,
        lastRun: null,
        status: dayOfWeek >= 3 && content.filter(c => c.image_prompt).length > 0 ? 'complete' : 'idle',
      },
      variants: {
        count: variantCount,
        lastRun: null,
        status: dayOfWeek >= 4 && variantCount > 0 ? 'complete' : 'idle',
      },
      validate: {
        count: pendingCount + approvedCount,
        lastRun: null,
        status: dayOfWeek >= 5 && (pendingCount + approvedCount) > 0 ? 'complete' : 'idle',
      },
      review: {
        count: pendingCount,
        lastRun: null,
        status: pendingCount > 0 ? 'complete' : 'idle',
      },
    };
  };

  const statuses = getStageStatuses();

  // Content status summary
  const statusCounts = {
    total: content.length,
    draft: content.filter(c => c.status === 'draft').length,
    pending_review: content.filter(c => c.status === 'pending_review').length,
    approved: content.filter(c => c.status === 'approved').length,
    rejected: content.filter(c => c.status === 'rejected').length,
  };

  // Recent activity (last 20 content items sorted by updated_at)
  const recentActivity = [...content]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 20);

  if (loading || authLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="flex gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 w-full bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Pipeline</h1>
          <p className="text-gray-500 mt-1">Visual overview of your autonomous marketing bots</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Summary Bar */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(statusCounts).map(([key, count]) => (
          <div key={key} className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            key === 'total' ? 'bg-gray-800 text-white' : STATUS_COLORS[key] || 'bg-gray-100 text-gray-600'
          }`}>
            {key === 'total' ? `${count} Total` : `${count} ${key.replace('_', ' ')}`}
          </div>
        ))}
      </div>

      {/* Pipeline Flow */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-stretch gap-2 min-w-[900px]">
          {STAGES.map((stage, i) => {
            const stageStatus = statuses[stage.key];
            return (
              <div key={stage.key} className="flex items-center">
                <Card
                  className={`w-[150px] border-2 ${stage.bgColor} transition-all cursor-pointer hover:shadow-md ${
                    stageStatus?.status === 'complete' ? 'ring-2 ring-green-300' : ''
                  }`}
                  onClick={() => router.push(stageLinks[stage.key])}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm mb-2 ${stage.color}`}>
                      {stage.icon}
                    </div>
                    <p className={`font-semibold text-sm ${stage.color}`}>{stage.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{stage.day}</p>

                    {/* Status indicator */}
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {stageStatus?.status === 'complete' ? (
                        <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />
                      ) : stageStatus?.status === 'error' ? (
                        <AlertCircle className="w-2.5 h-2.5 text-red-500" />
                      ) : (
                        <Clock className="w-2.5 h-2.5 text-gray-300" />
                      )}
                      <span className="text-xs text-gray-500">
                        {stageStatus?.count || 0} items
                      </span>
                    </div>

                    {stageStatus?.lastRun && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(stageStatus.lastRun).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </CardContent>
                </Card>
                {i < STAGES.length - 1 && (
                  <ArrowRight className={`w-5 h-5 mx-1 shrink-0 ${
                    stageStatus?.status === 'complete' ? 'text-green-400' : 'text-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaigns Summary */}
      {campaigns.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Active Campaigns</p>
            <div className="flex flex-wrap gap-2">
              {campaigns.slice(0, 8).map(c => (
                <div key={c.id} className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full text-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    c.status === 'active' ? 'bg-green-400' : c.status === 'draft' ? 'bg-gray-300' : 'bg-yellow-400'
                  }`} />
                  <span className="font-medium text-gray-700">{c.name}</span>
                  <span className="text-gray-400">{c.campaign_type}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Feed */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-400 text-sm">
              No content yet. Run the Strategy pipeline to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {recentActivity.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-lg text-sm hover:bg-gray-50 cursor-pointer group"
                onClick={() => setSelectedContentId(item.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || STATUS_COLORS.draft}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                  <span className="text-gray-800 truncate">
                    {item.headline || `${item.platform} ${item.content_type}`}
                  </span>
                  {item.variant_label && (
                    <span className="text-xs font-bold text-purple-500">{item.variant_label}</span>
                  )}
                  {item.image_url && (
                    <span className="text-xs text-emerald-500 font-medium">has image</span>
                  )}
                  {item.marketing_campaigns && (
                    <span className="text-xs text-gray-400">{item.marketing_campaigns.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                  <span>{item.platform}</span>
                  <span>{item.scheduled_date || ''}</span>
                  <span>{new Date(item.updated_at || item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content Detail Modal */}
      <ContentDetail
        contentId={selectedContentId}
        isOpen={!!selectedContentId}
        onClose={() => setSelectedContentId(null)}
        onRefresh={fetchData}
      />
    </div>
  );
}
