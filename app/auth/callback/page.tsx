'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

function CallbackHandler() {
  const router = useRouter();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleCallback = async () => {
      const supabase = createClient();

      // Handle implicit flow: tokens come in URL hash fragment
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      // Handle PKCE flow: code comes in query params
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      let session;

      if (access_token && refresh_token) {
        // Implicit flow — set session from hash tokens
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          console.error('setSession error:', error);
          router.replace('/login?error=auth_failed');
          return;
        }
        session = data.session;
      } else if (code) {
        // PKCE flow — exchange code for session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('exchangeCodeForSession error:', error);
          router.replace('/login?error=auth_failed');
          return;
        }
        session = data.session;
      } else {
        // No tokens and no code — something went wrong
        router.replace('/login?error=auth_failed');
        return;
      }

      if (!session?.user) {
        router.replace('/login?error=auth_failed');
        return;
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, status, group_id')
        .eq('id', session.user.id)
        .single();

      // Check if a group code was saved during sign-up
      const signupGroupCode = localStorage.getItem('signup_group_code');

      if (!existingProfile) {
        // Look up group if signup code was provided
        let groupId: string | null = null;
        if (signupGroupCode) {
          const { data: group } = await supabase
            .from('organization_groups')
            .select('id')
            .eq('group_code', signupGroupCode)
            .single();
          groupId = group?.id ?? null;
          localStorage.removeItem('signup_group_code');
        }

        // Create new profile — include group_id if we have it from sign-up
        const { error: insertError } = await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email,
          full_name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0],
          role: 'tech',
          status: 'pending',
          ...(groupId ? { group_id: groupId } : {}),
        } as Record<string, unknown>);

        if (insertError) {
          console.error('Profile creation error:', insertError);
          router.replace('/login?error=auth_failed');
          return;
        }

        // Send admin notification email
        try {
          await fetch('/api/auth/new-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              email: session.user.email,
            }),
          });
        } catch {
          // Not critical
        }

        // If group was set, go directly to pending. Otherwise, onboarding.
        router.replace(groupId ? '/pending' : '/onboarding');
        return;
      }

      // Existing profile without a group — try using signup code, or send to onboarding
      if (!existingProfile.group_id) {
        if (signupGroupCode) {
          const { data: group } = await supabase
            .from('organization_groups')
            .select('id')
            .eq('group_code', signupGroupCode)
            .single();
          localStorage.removeItem('signup_group_code');

          if (group) {
            await supabase
              .from('profiles')
              .update({ group_id: group.id })
              .eq('id', session.user.id);

            router.replace('/pending');
            return;
          }
        }

        router.replace('/onboarding');
        return;
      }

      if (existingProfile.status === 'rejected') {
        router.replace('/login?error=access_denied');
        return;
      }

      if (existingProfile.status === 'pending') {
        router.replace('/pending');
        return;
      }

      router.replace('/admin');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Signing in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Signing in...</p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
