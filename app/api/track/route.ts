import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // IP from Vercel headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";

    // Geo from Vercel edge headers (free on all plans)
    const city = req.headers.get("x-vercel-ip-city") || null;
    const country = req.headers.get("x-vercel-ip-country") || null;
    const region = req.headers.get("x-vercel-ip-country-region") || null;
    const latitude = req.headers.get("x-vercel-ip-latitude") || null;
    const longitude = req.headers.get("x-vercel-ip-longitude") || null;

    await supabase.from("visits").insert({
      ip: ip.substring(0, 45),
      path: (body.path || "/").substring(0, 200),
      type: body.type === "login" ? "login" : "visit",
      user_id: body.user_id || null,
      user_email: body.user_email || null,
      city,
      country,
      region,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      user_agent: (req.headers.get("user-agent") || "").substring(0, 300),
      referrer: (body.referrer || "").substring(0, 500),
    });

    return NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: true }); // fail silently
  }
}
