import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { AuthProvider } from '@/components/AuthProvider';
import { Sidebar } from '@/components/Sidebar';
import { AdminHeader } from '@/components/AdminHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SessionRefresh } from '@/components/SessionRefresh';
import { Profile, OrganizationGroup } from '@/types';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  // Middleware already verified auth + profile — read user/group IDs from headers
  const userId = headerStore.get('x-user-id');
  const groupId = headerStore.get('x-group-id');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // Fetch profile and group in parallel — no need for getUser() since middleware already verified
  const [profileResult, groupResult] = await Promise.all([
    userId
      ? supabase.from('profiles').select('*').eq('id', userId).single()
      : Promise.resolve({ data: null }),
    groupId
      ? supabase.from('organization_groups').select('*').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
  ]);

  const initialProfile = (profileResult.data as Profile | null);
  const initialGroup = (groupResult.data as OrganizationGroup | null);

  return (
    <AuthProvider initialProfile={initialProfile} initialGroup={initialGroup}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <AdminHeader />
        <main className="lg:pl-64 pt-14 pb-16 lg:pb-0">
          <div className="px-3 py-2 sm:p-4 lg:p-8">{children}</div>
        </main>
        <MobileBottomNav />
        <SessionRefresh />
      </div>
    </AuthProvider>
  );
}
