'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Keeps the auth session fresh by re-running middleware (which refreshes the Supabase token)
// when the user returns to the tab or after a period of inactivity.
export function SessionRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Refresh when user returns to the tab (e.g., after switching apps on phone)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };

    // Also refresh on a timer every 10 minutes as a safety net
    const interval = setInterval(() => {
      router.refresh();
    }, 10 * 60 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
