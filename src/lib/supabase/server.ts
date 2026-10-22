import "server-only";

import { createServerClient, DEFAULT_COOKIE_OPTIONS } from "@supabase/ssr";
import { cookies } from "next/headers";

// Only Server Actions / Route Handlers may opt into cookie writes.
export async function createClient({ canWriteCookies = false } = {}) {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new Error("Falta configurar Supabase Auth.");

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        // Server Components cannot write cookies. Proxy already refreshed them.
        // Do not catch SDK/authentication errors or errors in writable contexts.
        if (!canWriteCookies) return;
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

// Also clear the local session if Auth is unavailable during signOut().
// Match only this project's default SDK cookie and its numbered chunks.
export async function clearAuthCookies() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return;
  const name = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const cookieStore = await cookies();
  cookieStore.getAll().forEach((cookie) => {
    const suffix = cookie.name.slice(name.length);
    if (cookie.name === name || cookie.name.startsWith(name) && /^\.\d+$/.test(suffix)) {
      cookieStore.set(cookie.name, "", { ...DEFAULT_COOKIE_OPTIONS, maxAge: 0 });
    }
  });
}
