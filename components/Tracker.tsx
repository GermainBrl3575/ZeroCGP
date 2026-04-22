"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function Tracker() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    // Don't track the same path twice in a row
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    // Don't track admin pages
    if (pathname.startsWith("/admin")) return;

    // Get user info if available (non-blocking)
    const track = async () => {
      let userId = null;
      let userEmail = null;
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          userId = data.user.id;
          userEmail = data.user.email;
        }
      } catch {}

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          user_id: userId,
          user_email: userEmail,
          referrer: typeof document !== "undefined" ? document.referrer : "",
        }),
      }).catch(() => {}); // fire and forget
    };

    // Small delay to not block page load
    setTimeout(track, 500);
  }, [pathname]);

  return null; // invisible component
}
