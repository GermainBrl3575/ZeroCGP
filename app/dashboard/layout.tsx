"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

interface Portfolio { id: string; name: string; type: "manual" | "optimized" }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activeId,   setActiveId]   = useState<string>("");
  const [loading,    setLoading]    = useState(true);

  const loadPortfolios = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { router.push("/auth/login"); return; }
    const { data: pfs } = await supabase
      .from("portfolios")
      .select("id, name, type")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false });
    if (pfs && pfs.length > 0) {
      setPortfolios(pfs as Portfolio[]);
      // Lire l'id dans window.location.search (côté client uniquement, pas de useSearchParams)
      if (typeof window !== "undefined") {
        const urlId = new URLSearchParams(window.location.search).get("id");
        setActiveId(prev => {
          if (urlId && pfs.find((p: Portfolio) => p.id === urlId)) return urlId;
          if (prev  && pfs.find((p: Portfolio) => p.id === prev))  return prev;
          return pfs[0].id;
        });
      } else {
        setActiveId(prev => prev || pfs[0].id);
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { loadPortfolios(); }, [loadPortfolios, pathname]);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0A1628", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, letterSpacing:".2em" }}>CHARGEMENT...</div>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar portfolios={portfolios} activePortfolioId={activeId} />
      <main style={{ flex:1, background:"#F5F4F1", overflowY:"auto", overflowX:"hidden", height:"100vh" }}>
        {children}
      </main>
    </div>
  );
}
