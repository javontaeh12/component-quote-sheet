'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// Keeps the auth session alive by proactively refreshing tokens
// when the user returns to the tab (e.g., after locking the phone).
// On mobile Safari, cookies set via JS can be cleared while backgrounded,
// so we refresh the session via the Supabase client (which writes fresh
// tokens to both cookies and localStorage) before triggering a server refresh.
export function SessionRefresh() {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    const refreshSession = async () => {
      if (refreshing.current) return;
      refreshing.current = true;

      try {
        const supabase = createClient();

        // Get current session — the storage adapter will restore from
        // localStorage if cookies are missing
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.refresh_token) {
          // Force a token refresh so fresh cookies are written
          // This handles expired access tokens after the phone was asleep
          await supabase.auth.refreshSession({
            refresh_token: session.refresh_token,
          });
        }

        // Now trigger a server refresh with the fresh cookies in place
        router.refresh();
      } catch {
        // Don't redirect on transient errors (network hiccup, phone waking up).
        // The middleware will handle real auth failures on next navigation.
      } finally {
        refreshing.current = false;
      }
    };

    // Run immediately on mount so localStorage gets the latest tokens
    // from the middleware-refreshed cookies (middleware can't update localStorage)
    refreshSession();

    // Refresh when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    // Also refresh on a timer every 10 minutes as a safety net
    const interval = setInterval(() => {
      refreshSession();
    }, 10 * 60 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
