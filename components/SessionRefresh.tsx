'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// Keeps the auth session alive by validating tokens when the user returns
// to the tab (e.g., after locking the phone or overnight).
// Uses getUser() instead of refreshSession() — the SDK's autoRefreshToken
// handles token rotation internally. Manually calling refreshSession() can
// race with autoRefreshToken, causing double-rotation and reuse detection
// which kills the session (the root cause of daily re-login issues).
export function SessionRefresh() {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    const refreshSession = async () => {
      if (refreshing.current) return;
      refreshing.current = true;

      try {
        const supabase = createClient();

        // getUser() validates the access token with the Supabase Auth API.
        // If the access token is expired, autoRefreshToken automatically
        // uses the refresh token to get fresh tokens (written to cookies
        // + localStorage by our storage adapter) before getUser() resolves.
        const { data: { user }, error } = await supabase.auth.getUser();

        if (user && !error) {
          // Session is valid — trigger a server refresh so middleware
          // picks up the fresh cookies
          router.refresh();
        }
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

    // Also refresh on a timer every 30 minutes as a safety net
    // (reduced from 10min to avoid excessive token operations)
    const interval = setInterval(() => {
      refreshSession();
    }, 30 * 60 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
