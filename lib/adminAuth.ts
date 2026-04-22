import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Super-admin: always admin, can promote others
const SUPER_ADMIN_EMAIL = "germain@burel.net";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ADMIN_EMAIL kept for backward compat in API routes (logging)
const ADMIN_EMAIL = SUPER_ADMIN_EMAIL;
export { supabaseAdmin, SUPER_ADMIN_EMAIL, ADMIN_EMAIL };

/**
 * Check if a user is admin.
 * Admin = super-admin email OR user_metadata.is_admin === true
 */
export function isUserAdmin(user: { email?: string; user_metadata?: Record<string, any> }): boolean {
  if (user.email === SUPER_ADMIN_EMAIL) return true;
  return user.user_metadata?.is_admin === true;
}

/**
 * Verify admin from Authorization header (Bearer token).
 * Returns the user if admin, or a 404 response.
 */
export async function verifyAdmin(req: NextRequest): Promise<{ user: any } | NextResponse> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user || !isUserAdmin(user)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return { user };
}
