"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function Tracker() {
  const pathname = usePathname();
  const tracked = useRef(false);

  useEffect(() => {
    // Track only ONCE per browser session (= 1 visit)
    if (tracked.current) return;
    if (pathname.startsWith("/admin")) return;

    tracked.current = true;

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

      // type = "visit" (landing on site) or "login" (authenticated session)
      const type = userId ? "login" : "visit";

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          user_id: userId,
          user_email: userEmail,
          type,
          referrer: typeof document !== "undefined" ? document.referrer : "",
        }),
      }).catch(() => {});
    };

    setTimeout(track, 500);
  }, [pathname]);

  return null;
}
