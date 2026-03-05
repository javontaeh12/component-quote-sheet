import { createClient } from '@supabase/supabase-js';
import { ServiceReportPreview } from '@/components/ServiceReportPreview';

export const dynamic = 'force-dynamic';

async function getReport(token: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: report } = await supabase
    .from('service_reports')
    .select('*')
    .eq('share_token', token)
    .single();

  if (!report) return null;

  const { data: media } = await supabase
    .from('service_report_media')
    .select('*')
    .eq('service_report_id', report.id)
    .order('sort_order');

  // Get group name for branding
  let groupName = 'HVAC Service';
  if (report.group_id) {
    const { data: group } = await supabase
      .from('organization_groups')
      .select('name')
      .eq('id', report.group_id)
      .single();
    if (group) groupName = group.name;
  }

  return { report, media: media || [], groupName };
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getReport(token);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-500">This report link may be invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <ServiceReportPreview
        report={result.report}
        media={result.media}
        groupName={result.groupName}
        showActions={true}
      />

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-blue-600 { background-color: #2563eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
