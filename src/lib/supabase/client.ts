"use client";

import { createBrowserClient } from "@supabase/ssr";

// @supabase/ssr reuses a singleton in the browser and stores sessions in cookies.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new Error("Falta configurar Supabase Auth.");

  return createBrowserClient(url, key);
}
