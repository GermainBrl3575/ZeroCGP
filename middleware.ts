import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_EMAIL = "germain@burel.net";

export async function middleware(req: NextRequest) {
  const isAdminPath = req.nextUrl.pathname.startsWith("/admin")
    || req.nextUrl.pathname.startsWith("/api/admin");

  if (!isAdminPath) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(c => res.cookies.set(c.name, c.value, c.options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    if (req.nextUrl.pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
