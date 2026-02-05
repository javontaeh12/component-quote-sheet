import { AuthProvider } from '@/components/AuthProvider';
import { Sidebar } from '@/components/Sidebar';
import { AdminHeader } from '@/components/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <AdminHeader />
        <main className="lg:pl-64 pt-14">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </AuthProvider>
  );
}
