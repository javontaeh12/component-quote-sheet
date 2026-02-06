'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { Profile, OrganizationGroup } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  groupId: string | null;
  group: OrganizationGroup | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  groupId: null,
  group: null,
  isLoading: true,
  signOut: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  initialProfile?: Profile | null;
  initialGroup?: OrganizationGroup | null;
}

export function AuthProvider({ children, initialProfile, initialGroup }: AuthProviderProps) {
  const hasInitialData = initialProfile !== undefined;
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(initialProfile ?? null);
  const [group, setGroup] = useState<OrganizationGroup | null>(initialGroup ?? null);
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const initDone = useRef(false);

  const fetchGroup = async (groupId: string | null) => {
    if (!groupId) {
      setGroup(null);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from('organization_groups')
      .select('*')
      .eq('id', groupId)
      .single();
    setGroup(data as OrganizationGroup | null);
  };

  useEffect(() => {
    const supabase = createClient();

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user ?? null;
        setUser(authUser);

        // Only fetch profile/group if we didn't get them from the server
        if (!hasInitialData && authUser) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
          const prof = data as Profile | null;
          setProfile(prof);
          await fetchGroup(prof?.group_id ?? null);
        }
      } catch (err) {
        console.error('Failed to get session:', err);
      } finally {
        initDone.current = true;
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Skip the initial event — initAuth handles it
        if (!initDone.current) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          const prof = data as Profile | null;
          setProfile(prof);
          await fetchGroup(prof?.group_id ?? null);
        } else {
          setProfile(null);
          setGroup(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(null);
    setProfile(null);
    setGroup(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, groupId: profile?.group_id ?? null, group, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
