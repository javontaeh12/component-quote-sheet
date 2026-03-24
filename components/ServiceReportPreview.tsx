'use client';

import { formatCurrency } from '@/lib/utils';
import {
  Snowflake,
  Shield,
  Zap,
  Thermometer,
  Clock,
  Heart,
  CheckCircle2,
  Star,
  AlertTriangle,
  Camera,
  Printer,
} from 'lucide-react';
import type { ServiceReport, ServiceReportMedia } from '@/types';

interface ServiceReportPreviewProps {
  report: ServiceReport;
  media: ServiceReportMedia[];
  groupName?: string;
  showActions?: boolean;
}

const IMPACT_ICONS: Record<string, typeof Zap> = {
  efficiency: Zap,
  safety: Shield,
  comfort: Thermometer,
  lifespan: Clock,
  energy_cost: Heart,
};

const IMPACT_LABELS: Record<string, string> = {
  efficiency: 'Energy Efficiency',
  safety: 'Safety',
  comfort: 'Comfort',
  lifespan: 'Equipment Lifespan',
  energy_cost: 'Energy Cost',
};

function ImpactBar({ value, label, iconKey }: { value: number; label: string; iconKey: string }) {
  const Icon = IMPACT_ICONS[iconKey] || Zap;
  const color = value <= 2 ? 'bg-green-500' : value <= 3 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700">{label}</span>
          <span className="font-medium text-gray-900">{value}/5</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(value / 5) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

export function ServiceReportPreview({ report, media, groupName, showActions = true }: ServiceReportPreviewProps) {
  const photos = media.filter((m) => m.type === 'photo');
  const videos = media.filter((m) => m.type === 'video');
  const severityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  const handlePrint = () => window.print();

  return (
    <div className="max-w-3xl mx-auto" id="service-report-preview">
      {/* Header */}
      <div className="bg-blue-600 text-white rounded-t-xl p-6 print:bg-blue-600 print:text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Snowflake className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{groupName || 'HVAC Service'}</h1>
              <p className="text-blue-100 text-sm">Service Report</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-blue-100">Service Date</p>
            <p className="font-semibold">{report.service_date ? new Date(report.service_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl">
        {/* Customer & Equipment */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</h2>
              <p className="font-medium text-gray-900">{report.customer_name || 'N/A'}</p>
              {report.customer_address && <p className="text-sm text-gray-600">{report.customer_address}</p>}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Equipment</h2>
              <p className="font-medium text-gray-900">{report.equipment_info?.equipment_type || 'N/A'}</p>
              <div className="text-sm text-gray-600 space-y-0.5">
                {report.equipment_info?.make && <p>{report.equipment_info.make} {report.equipment_info.model}</p>}
                {report.equipment_info?.serial_number && <p>S/N: {report.equipment_info.serial_number}</p>}
                {report.equipment_info?.tonnage && <p>Tonnage: {report.equipment_info.tonnage}</p>}
                {report.equipment_info?.condition && <p>Condition: {report.equipment_info.condition}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Warranty */}
        {report.warranty_info?.has_warranty && (
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-blue-800">Warranty Active</h2>
            </div>
            <p className="text-sm text-blue-700">
              {report.warranty_info.warranty_type && <span className="capitalize">{report.warranty_info.warranty_type}</span>}
              {report.warranty_info.provider && <span> by {report.warranty_info.provider}</span>}
              {report.warranty_info.expiration && <span> (Expires: {report.warranty_info.expiration})</span>}
            </p>
            {report.warranty_info.coverage && <p className="text-sm text-blue-600 mt-1">Coverage: {report.warranty_info.coverage}</p>}
          </div>
        )}

        {/* AI Customer Summary */}
        {report.ai_customer_summary && (
          <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-white">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">What We Found</h2>
                <p className="text-sm text-gray-700 leading-relaxed">{report.ai_customer_summary.findings_summary}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-700 mb-1">Why This Matters</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{report.ai_customer_summary.urgency_explanation}</p>
              </div>
              {report.ai_customer_summary.recommendation && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-green-800 mb-1">Our Recommendation</h3>
                  <p className="text-sm text-green-700 leading-relaxed">{report.ai_customer_summary.recommendation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Problem Found */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Problem Found</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${severityColors[report.problem_details?.severity || 'medium']}`}>
              {report.problem_details?.severity || 'medium'}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{report.problem_found || 'No description provided.'}</p>
          {report.problem_details?.symptoms?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {report.problem_details.symptoms.map((s: string) => (
                <span key={s} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{s}</span>
              ))}
            </div>
          )}
          {report.problem_details?.area_affected && (
            <p className="text-sm text-gray-500 mt-2">Area Affected: {report.problem_details.area_affected}</p>
          )}
        </div>

        {/* System Impact */}
        {(report.system_impact || report.impact_details) && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">System Impact</h2>
            {report.system_impact && <p className="text-gray-700 mb-4">{report.system_impact}</p>}
            {report.impact_details && (
              <div className="space-y-3">
                {Object.entries(IMPACT_LABELS).map(([key, label]) => (
                  <ImpactBar
                    key={key}
                    iconKey={key}
                    label={label}
                    value={report.impact_details?.[key as keyof typeof report.impact_details] || 0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Repair Options */}
        {report.repair_options?.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Repair Options</h2>
            <div className="space-y-4">
              {report.repair_options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`border rounded-xl overflow-hidden ${
                    opt.is_recommended ? 'border-green-400 ring-1 ring-green-400' : 'border-gray-200'
                  }`}
                >
                  {opt.is_recommended && (
                    <div className="bg-green-50 px-4 py-2 flex items-center gap-2">
                      <Star className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Recommended</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                          {opt.label}
                        </span>
                        <h3 className="font-semibold text-gray-900">{opt.name || `Option ${opt.label}`}</h3>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(opt.subtotal)}</span>
                    </div>

                    {/* Line items table */}
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-1 text-gray-500 font-medium">Item</th>
                            <th className="text-center py-1 text-gray-500 font-medium w-16">Type</th>
                            <th className="text-center py-1 text-gray-500 font-medium w-12">Qty</th>
                            <th className="text-right py-1 text-gray-500 font-medium w-20">Price</th>
                            <th className="text-right py-1 text-gray-500 font-medium w-20">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opt.line_items.map((li, liIdx) => (
                            <tr key={liIdx} className="border-b border-gray-50">
                              <td className="py-1.5 text-gray-700">{li.description}</td>
                              <td className="py-1.5 text-center text-gray-500 capitalize text-xs">{li.type.replace('_', ' ')}</td>
                              <td className="py-1.5 text-center text-gray-700">{li.quantity}</td>
                              <td className="py-1.5 text-right text-gray-700">{formatCurrency(li.unit_price)}</td>
                              <td className="py-1.5 text-right font-medium text-gray-900">{formatCurrency(li.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {opt.benefits?.length > 0 && opt.benefits.some((b: string) => b) && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">Benefits:</p>
                        <ul className="space-y-1">
                          {opt.benefits.filter((b: string) => b).map((b: string, bIdx: number) => (
                            <li key={bIdx} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {opt.timeline && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Timeline: {opt.timeline}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upgrades */}
        {report.upgrades?.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recommended Upgrades</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.upgrades.map((upg, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900">{upg.name}</h3>
                    <span className="font-semibold text-gray-900">{formatCurrency(upg.price)}</span>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize mb-2 ${
                    upg.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    upg.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {upg.priority} priority
                  </span>
                  {upg.benefits?.length > 0 && upg.benefits.some((b: string) => b) && (
                    <ul className="space-y-0.5">
                      {upg.benefits.filter((b: string) => b).map((b: string, bIdx: number) => (
                        <li key={bIdx} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Photo Evidence</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((p) => (
                <div key={p.id}>
                  <img src={p.url} alt={p.caption || ''} className="w-full h-40 object-cover rounded-lg" />
                  {p.caption && <p className="text-xs text-gray-600 mt-1">{p.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {videos.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Video Evidence</h2>
            <div className="space-y-3">
              {videos.map((v) => (
                <div key={v.id}>
                  <video src={v.url} controls className="w-full rounded-lg max-h-64" />
                  {v.caption && <p className="text-xs text-gray-600 mt-1">{v.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-gray-50 rounded-b-xl text-center">
          <p className="text-sm text-gray-500">
            This report was prepared by {groupName || 'your HVAC service provider'}.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            For questions, please contact us directly.
          </p>

          {showActions && (
            <div className="flex justify-center gap-3 mt-4 print:hidden">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
