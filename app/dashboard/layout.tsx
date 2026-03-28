// app/dashboard/layout.tsx
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
      if (!data.user) {
        router.push("/auth/login");
        return;
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30 text-xs tracking-[0.2em]">CHARGEMENT...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        portfolios={portfolios}
        activePortfolioId={activeId}
        onSelectPortfolio={setActiveId}
      />
      <main className="flex-1 bg-[#F5F4F1] overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
