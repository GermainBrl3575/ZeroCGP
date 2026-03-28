// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client côté navigateur
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client côté serveur (avec service role — ne jamais exposer côté client)
export const supabaseAdmin = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// ─── Helpers portefeuilles ───────────────────────────────────────────────────

export async function getPortfolios(userId: string) {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*, portfolio_assets(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPortfolio(
  userId: string,
  name: string,
  type: "manual" | "optimized" = "manual"
) {
  const { data, error } = await supabase
    .from("portfolios")
    .insert({ user_id: userId, name, type })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePortfolio(portfolioId: string) {
  const { error } = await supabase
    .from("portfolios")
    .delete()
    .eq("id", portfolioId);
  if (error) throw error;
}

export async function upsertAssets(
  portfolioId: string,
  assets: Array<{
    symbol: string;
    name: string;
    isin?: string;
    type: string;
    quantity: number;
  }>
) {
  // Supprimer les actifs existants puis réinsérer
  await supabase
    .from("portfolio_assets")
    .delete()
    .eq("portfolio_id", portfolioId);

  if (assets.length === 0) return;

  const { error } = await supabase.from("portfolio_assets").insert(
    assets.map((a) => ({ ...a, portfolio_id: portfolioId }))
  );
  if (error) throw error;
}
