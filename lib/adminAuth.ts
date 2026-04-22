import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "germain@burel.net";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export { supabaseAdmin, ADMIN_EMAIL };

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

  if (error || !user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return { user };
}
