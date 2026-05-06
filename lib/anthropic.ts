import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MODELS = {
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-7",
} as const;

// Cost per million tokens (USD)
const COST_PER_MTOK = {
  sonnet: { input: 3, output: 15 },
  opus: { input: 5, output: 25 },
} as const;

export type AgentModel = keyof typeof MODELS;

export interface AgentResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export async function callAgent(
  systemPrompt: string,
  userPrompt: string,
  model: AgentModel = "sonnet",
  maxTokens: number = 2000
): Promise<AgentResponse> {
  const response = await client.messages.create({
    model: MODELS[model],
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content[0]?.type === "text" ? response.content[0].text : "";
  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;
  const cost = COST_PER_MTOK[model];
  const costUsd = (tokensIn * cost.input + tokensOut * cost.output) / 1_000_000;

  return { content, tokensIn, tokensOut, costUsd: Math.round(costUsd * 10000) / 10000 };
}

export function parseAgentJson<T>(raw: string): T | null {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return null;
  }
}
