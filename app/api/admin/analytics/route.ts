import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, supabaseAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const days = parseInt(req.nextUrl.searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 86400000).toISOString();

  try {
    // Get all visits in period
    const { data: visits } = await supabaseAdmin
      .from("visits")
      .select("ip, path, user_id, user_email, city, country, region, latitude, longitude, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    const allVisits = visits || [];

    // Aggregate stats
    const uniqueIPs = new Set(allVisits.map(v => v.ip));
    const loggedIn = allVisits.filter(v => v.user_id);
    const uniqueUsers = new Set(loggedIn.map(v => v.user_id));

    // By country
    const byCountry: Record<string, number> = {};
    allVisits.forEach(v => { if (v.country) byCountry[v.country] = (byCountry[v.country] || 0) + 1; });

    // By city (France only)
    const byCity: Record<string, { count: number; lat: number | null; lon: number | null }> = {};
    allVisits.filter(v => v.country === "FR").forEach(v => {
      if (v.city) {
        if (!byCity[v.city]) byCity[v.city] = { count: 0, lat: v.latitude, lon: v.longitude };
        byCity[v.city].count++;
      }
    });

    // By page
    const byPage: Record<string, number> = {};
    allVisits.forEach(v => { byPage[v.path] = (byPage[v.path] || 0) + 1; });

    // By day
    const byDay: Record<string, number> = {};
    allVisits.forEach(v => {
      const day = v.created_at.split("T")[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    // Recent visits (last 50)
    const recent = allVisits.slice(0, 50).map(v => ({
      ip: v.ip, path: v.path, city: v.city, country: v.country,
      user_email: v.user_email, created_at: v.created_at,
    }));

    // Geo points for map (all with coordinates)
    const geoPoints = allVisits
      .filter(v => v.latitude && v.longitude)
      .map(v => ({ lat: v.latitude, lon: v.longitude, city: v.city, country: v.country }));

    return NextResponse.json({
      stats: {
        total_visits: allVisits.length,
        unique_ips: uniqueIPs.size,
        logged_in_visits: loggedIn.length,
        unique_users: uniqueUsers.size,
        days,
      },
      byCountry: Object.entries(byCountry).sort((a, b) => b[1] - a[1]),
      byCity: Object.entries(byCity).sort((a, b) => b[1].count - a[1].count).slice(0, 30),
      byPage: Object.entries(byPage).sort((a, b) => b[1] - a[1]).slice(0, 20),
      byDay: Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])),
      recent,
      geoPoints,
    });
  } catch (err) {
    console.error("Admin analytics error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
