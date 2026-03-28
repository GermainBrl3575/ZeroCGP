"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<Array<{ id: string; name: string }>>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/auth/login"); return; }
      supabase
        .from("portfolios")
        .select("id, name")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .then(({ data: pfs }) => {
          if (pfs && pfs.length > 0) {
            setPortfolios(pfs);
            setActiveId(pfs[0].id);
          }
          setLoading(false);
        });
    });
  }, [router]);

  if (loading) return (
    <div style={{
      minHeight: "100vh", background: "#0A1628",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: ".2em" }}>
        CHARGEMENT...
      </div>
    </div>
  );

  return (
    <div style={{
      display: "flex",
      height: "100vh",      /* hauteur fixe pour l'ensemble */
      overflow: "hidden",   /* empêche le scroll du wrapper */
    }}>
      {/* Sidebar fixe, ne scroll pas */}
      <Sidebar
        portfolios={portfolios}
        activePortfolioId={activeId}
        onSelectPortfolio={setActiveId}
      />

      {/* Zone de contenu — SCROLL ici uniquement */}
      <main style={{
        flex: 1,
        background: "#F5F4F1",
        overflowY: "auto",      /* scroll vertical sur le contenu */
        overflowX: "hidden",
        height: "100vh",
      }}>
        {children}
      </main>
    </div>
  );
}
