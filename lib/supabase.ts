import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton instance to avoid multiple GoTrue clients
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseInstance: ReturnType<typeof createSupabaseClient<any>> | null = null;

// Max size per cookie chunk (keep well under 4KB to account for name + metadata)
const CHUNK_SIZE = 3500;

// Helper: parse all cookies into a { name: value } map
function parseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const map: Record<string, string> = {};
  for (const c of document.cookie.split(';')) {
    const trimmed = c.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const name = trimmed.substring(0, eqIdx);
    const value = trimmed.substring(eqIdx + 1);
    map[name] = decodeURIComponent(value);
  }
  return map;
}

// Helper: delete a cookie and any chunks of it
function deleteCookieAndChunks(key: string) {
  if (typeof document === 'undefined') return;
  // Delete the base key
  document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  // Delete any numbered chunks (.0, .1, .2, ...)
  const cookies = parseCookies();
  for (let i = 0; i < 20; i++) {
    const chunkName = `${key}.${i}`;
    if (!(chunkName in cookies)) break;
    document.cookie = `${chunkName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

// Using @supabase/supabase-js with chunked cookie storage instead of @supabase/ssr's createBrowserClient
// because createBrowserClient in @supabase/ssr v0.8.0 causes queries to hang indefinitely.
// Chunked cookies match the format @supabase/ssr uses (key.0, key.1, ...) so the middleware can read them.
export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          if (typeof document === 'undefined') return null;
          const cookies = parseCookies();

          // Try single (non-chunked) cookie first
          if (key in cookies) return cookies[key];

          // Try chunked cookies: key.0, key.1, ...
          const chunks: string[] = [];
          for (let i = 0; i < 20; i++) {
            const chunkName = `${key}.${i}`;
            if (!(chunkName in cookies)) break;
            chunks.push(cookies[chunkName]);
          }
          return chunks.length > 0 ? chunks.join('') : null;
        },

        setItem: (key: string, value: string) => {
          if (typeof document === 'undefined') return;
          // Always clean up old cookies/chunks first
          deleteCookieAndChunks(key);

          const encoded = encodeURIComponent(value);
          if (encoded.length <= CHUNK_SIZE) {
            // Fits in a single cookie
            document.cookie = `${key}=${encoded}; path=/; max-age=31536000; SameSite=Lax`;
          } else {
            // Split into chunks matching @supabase/ssr format: key.0, key.1, ...
            for (let i = 0; i * CHUNK_SIZE < encoded.length; i++) {
              const chunk = encoded.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              document.cookie = `${key}.${i}=${chunk}; path=/; max-age=31536000; SameSite=Lax`;
            }
          }
        },

        removeItem: (key: string) => {
          deleteCookieAndChunks(key);
        },
      },
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
}
