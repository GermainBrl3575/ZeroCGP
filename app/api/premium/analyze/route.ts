import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/adminAuth";
import { canUsePremium } from "@/lib/canUsePremium";
import { callAgent, parseAgentJson } from "@/lib/anthropic";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Minimal CGP agent for connectivity test (1.1)
// Full 6-agent orchestration will replace this in 1.2
const CGP_SYSTEM = `Tu es un conseiller en gestion de patrimoine (CGP) certifié analysant un portefeuille d'investissement.
Langue française exclusivement. Ton professionnel et pédagogique.
Analyse la conformité du portefeuille : éligibilité PEA/AV/CTO, optimisation fiscale, cohérence MiFID II.
Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "conformite": {
    "score": <0-100>,
    "pea_eligible": <boolean>,
    "av_eligible": <boolean>,
    "cto_optimal": <boolean>,
    "points_forts": [<string>],
    "points_attention": [<string>],
    "recommandations": [<string>]
  }
}`;

export async function POST(req: NextRequest) {
  // Auth
  const auth = await verifyUser(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Premium gate
  if (!canUsePremium(user)) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

  // Parse body
  const body = await req.json().catch(() => ({}));
  const portfolioId = body.portfolio_id;
  if (!portfolioId) {
    return NextResponse.json({ error: "Missing portfolio_id" }, { status: 400 });
  }

  // Verify portfolio belongs to user
  const { data: portfolio } = await supabase
    .from("portfolios").select("id, name, type, created_at")
    .eq("id", portfolioId).eq("user_id", user.id).single();

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  // Rate limit: 1 analysis per minute
  const { data: recent } = await supabase
    .from("premium_analyses")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recent?.[0]) {
    const elapsed = Date.now() - new Date(recent[0].created_at).getTime();
    if (elapsed < 60000) {
      const retryAfter = Math.ceil((60000 - elapsed) / 1000);
      return NextResponse.json(
        { error: "rate_limited", retryAfter },
        { status: 429 }
      );
    }
  }

  // Fetch assets
  const { data: assets } = await supabase
    .from("portfolio_assets")
    .select("symbol, name, type, weight, target_amount, isin")
    .eq("portfolio_id", portfolioId)
    .order("weight", { ascending: false });

  if (!assets?.length) {
    return NextResponse.json({ error: "No assets in portfolio" }, { status: 400 });
  }

  // Insert pending analysis
  const capitalInitial = assets.reduce((s, a) => s + (a.target_amount || 0), 0);
  const { data: analysis, error: insertErr } = await supabase
    .from("premium_analyses")
    .insert({
      portfolio_id: portfolioId,
      user_id: user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !analysis) {
    return NextResponse.json({ error: "Failed to create analysis" }, { status: 500 });
  }

  // Build user prompt
  const assetList = assets.map(a =>
    `- ${a.symbol} (${a.name}) : ${a.type}, poids ${(a.weight * 100).toFixed(1)}%, montant ${a.target_amount}€${a.isin ? `, ISIN ${a.isin}` : ""}`
  ).join("\n");

  const userPrompt = `Analyse ce portefeuille :
Nom : ${portfolio.name}
Type : ${portfolio.type}
Capital initial : ${capitalInitial}€
Créé le : ${portfolio.created_at}

Actifs :
${assetList}`;

  try {
    // Call CGP agent (test for 1.1 — will be replaced by 6-agent orchestration)
    const response = await callAgent(CGP_SYSTEM, userPrompt, "sonnet");
    const parsed = parseAgentJson(response.content);

    await supabase
      .from("premium_analyses")
      .update({
        status: "completed",
        conformite: parsed || { raw: response.content },
        completed_at: new Date().toISOString(),
        total_tokens_used: response.tokensIn + response.tokensOut,
        cost_usd: response.costUsd,
      })
      .eq("id", analysis.id);

    return NextResponse.json({
      analysisId: analysis.id,
      status: "completed",
      conformite: parsed || { raw: response.content },
      cost: { tokensIn: response.tokensIn, tokensOut: response.tokensOut, usd: response.costUsd },
    });
  } catch (err: any) {
    await supabase
      .from("premium_analyses")
      .update({ status: "failed", error_message: err.message || "Unknown error" })
      .eq("id", analysis.id);

    return NextResponse.json({ error: "Analysis failed", message: err.message }, { status: 500 });
  }
}
