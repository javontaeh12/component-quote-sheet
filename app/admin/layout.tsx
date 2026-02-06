import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AuthProvider } from '@/components/AuthProvider';
import { Sidebar } from '@/components/Sidebar';
import { AdminHeader } from '@/components/AdminHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Profile, OrganizationGroup } from '@/types';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

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

  let initialProfile: Profile | null = null;
  let initialGroup: OrganizationGroup | null = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    initialProfile = profile as Profile | null;

    if (initialProfile?.group_id) {
      const { data: group } = await supabase
        .from('organization_groups')
        .select('*')
        .eq('id', initialProfile.group_id)
        .single();
      initialGroup = group as OrganizationGroup | null;
    }
  }

  return (
    <AuthProvider initialProfile={initialProfile} initialGroup={initialGroup}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <AdminHeader />
        <main className="lg:pl-64 pt-14 pb-16 lg:pb-0">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </AuthProvider>
  );
}
