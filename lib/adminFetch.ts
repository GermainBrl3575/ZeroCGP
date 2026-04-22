import { supabase } from "@/lib/supabase";

/**
 * Fetch wrapper for admin API routes.
 * Passes the Supabase access token in Authorization header.
 */
export async function adminFetch(url: string, options?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      "Authorization": `Bearer ${token}`,
    },
  });
}
