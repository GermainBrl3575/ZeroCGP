"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "germain@burel.net";

const C = {
  cream: "#FAF8F3", navy: "#050B14", navyText: "rgba(5,11,20,0.88)",
  sapphire: "#1a3a6a", textLight: "rgba(5,11,20,0.36)",
  border: "rgba(5,11,20,0.07)", borderCard: "rgba(5,11,20,0.09)",
  red: "#DC2626", redBg: "rgba(220,38,38,0.06)", redBorder: "rgba(220,38,38,0.15)",
};
const EASE = "all 0.3s ease";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" },
  { label: "Utilisateurs", href: "/admin/users", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { label: "Portfolios", href: "/admin/portfolios", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hovNav, setHovNav] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email === ADMIN_EMAIL) {
        setAuthorized(true);
      } else {
        router.replace("/");
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter,sans-serif", color: "rgba(5,11,20,0.3)", fontSize: 11 }}>Vérification...</div>;
  if (!authorized) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.cream, fontFamily: "Inter,sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, minWidth: 220, background: "white",
        borderRight: `0.5px solid ${C.border}`, padding: "20px 0",
        display: "flex", flexDirection: "column",
      }}>
        {/* Admin badge */}
        <div style={{ padding: "0 20px", marginBottom: 24 }}>
          <div style={{
            background: C.redBg, border: `0.5px solid ${C.redBorder}`, borderRadius: 6,
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.red }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: C.red }}>
              Admin
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "0 10px" }}>
          {NAV.map(item => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const hov = hovNav === item.href;
            return (
              <Link key={item.href} href={item.href}
                onMouseEnter={() => setHovNav(item.href)} onMouseLeave={() => setHovNav(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  borderRadius: 6, marginBottom: 2, textDecoration: "none",
                  background: active ? "rgba(5,11,20,0.04)" : hov ? "rgba(5,11,20,0.02)" : "transparent",
                  transition: EASE,
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={active ? C.navyText : "rgba(5,11,20,0.35)"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span style={{
                  fontSize: 13, fontWeight: active ? 500 : 400,
                  color: active ? C.navyText : "rgba(5,11,20,0.52)",
                }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to dashboard */}
        <div style={{ padding: "0 20px" }}>
          <Link href="/dashboard" style={{
            fontSize: 11, fontWeight: 400, color: C.textLight,
            textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>←</span> Retour au dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto" }}>
        {/* Top bar */}
        <div style={{
          padding: "12px 32px", borderBottom: `0.5px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(220,38,38,0.03)",
        }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: C.red }}>
            Mode admin — germain@burel.net
          </span>
          <span style={{ fontSize: 10, color: C.textLight }}>Zero CGP</span>
        </div>

        {/* Page content */}
        <div style={{ padding: "32px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
