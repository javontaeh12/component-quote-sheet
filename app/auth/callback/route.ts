import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in Server Components
            }
          },
        },
      }
    );

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', sessionData.user.id)
        .single();

      if (!existingProfile) {
        // Create new profile with pending status
        await supabase.from('profiles').insert({
          id: sessionData.user.id,
          email: sessionData.user.email,
          full_name: sessionData.user.user_metadata?.full_name || sessionData.user.email?.split('@')[0],
          role: 'tech',
          status: 'pending',
        });

        // Send email notification to admin
        if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: 'HVAC Portal <onboarding@resend.dev>',
              to: process.env.ADMIN_EMAIL,
              subject: 'New User Access Request',
              html: `
                <h2>New User Access Request</h2>
                <p>A new user has requested access to the HVAC Service Tech Portal:</p>
                <ul>
                  <li><strong>Name:</strong> ${sessionData.user.user_metadata?.full_name || 'Not provided'}</li>
                  <li><strong>Email:</strong> ${sessionData.user.email}</li>
                </ul>
                <p>Please log in to the admin portal to approve or reject this request.</p>
                <p><a href="${origin}/admin/users">Go to User Management</a></p>
              `,
            });
          } catch (emailError) {
            console.error('Failed to send admin notification email:', emailError);
          }
        }

        // Redirect new users to pending page
        return NextResponse.redirect(`${origin}/pending`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
