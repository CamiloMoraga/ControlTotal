import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuthorizedUser = { id: string; email: string };
type Authorization =
  | { status: "authorized"; user: AuthorizedUser }
  | { status: "session" | "denied" | "configuration" | "unavailable" };

function normalizeEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase();
  // Exact comparison only: no aliases, dot removal, or provider-specific rules.
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized
    : null;
}

// React cache only deduplicates within one server render, never across users/requests.
export const getAuthorization = cache(async (client?: SupabaseClient): Promise<Authorization> => {
  const allowedEmail = normalizeEmail(process.env.CONTROL_USER_EMAIL);
  if (!allowedEmail) return { status: "configuration" };

  try {
    const supabase = client ?? await createClient();
    // A verified JWT alone cannot prove that the account/session is still active.
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return { status: error.status && [400, 401, 403].includes(error.status)
        || error.name === "AuthSessionMissingError" ? "session" : "unavailable" };
    }
    if (!user) return { status: "session" };

    const email = normalizeEmail(user.email);
    if (!email || email !== allowedEmail) return { status: "denied" };

    return { status: "authorized", user: { id: user.id, email } };
  } catch {
    // Network/configuration failures never grant access. No token/error payload logs.
    return { status: "unavailable" };
  }
});

// Call in every future private Server Action / Route Handler before using Prisma.
// Layout checks do not protect direct calls to those entry points.
export async function requireAuthorizedUser(): Promise<AuthorizedUser> {
  const authorization = await getAuthorization();
  if (authorization.status !== "authorized") {
    redirect(`/login?reason=${authorization.status}`);
  }
  return authorization.user;
}
