import { NextResponse } from "next/server";
import { requireAllowlistedUser } from "@/lib/authz";
import { chatAi, getAiInsight, parseModules, sanitizeGuardrails } from "@/lib/ai";

export const dynamic = "force-dynamic";

// /api/ai — text-only Gemini insight. Allowlisted users only.
// Server key GEMINI_API_KEY never leaves the server.
// GET ?modules=&days=&minRoi=&maxCpa=&fee= — cached single-shot analysis.
// POST {message, history, modules, days, guardrails} — follow-up chat, live.
function guardrailsFrom(input: {
  minRoi?: any; maxCpa?: any; fee?: any;
  guardrails?: { minNetRoi?: any; maxCpa?: any; feeRate?: any };
}) {
  const g = input.guardrails ?? {};
  return sanitizeGuardrails({
    minNetRoi: input.minRoi ?? g.minNetRoi,
    maxCpa: input.maxCpa ?? g.maxCpa,
    feeRate: input.fee ?? g.feeRate,
  });
}

export async function GET(req: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const url = new URL(req.url);
  const modules = parseModules(url.searchParams.get("modules"));
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 7, 1), 14);
  const g = guardrailsFrom({
    minRoi: url.searchParams.get("minRoi"),
    maxCpa: url.searchParams.get("maxCpa"),
    fee: url.searchParams.get("fee"),
  });
  try {
    const out = await getAiInsight(modules, days, g);
    return NextResponse.json({
      markdown: out.markdown,
      modules: out.modules,
      days: out.days,
      model: out.model,
      cached: (out as { cached?: boolean }).cached ?? false,
      at: new Date(out.at).toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "ai failed";
    const status = /GEMINI_API_KEY is not set/.test(message) ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const message = String(body?.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "empty message" }, { status: 400 });
  if (message.length > 1000) return NextResponse.json({ error: "message too long (1000 max)" }, { status: 400 });
  const modules = parseModules(body?.modules);
  const days = Math.min(Math.max(Number(body?.days) || 7, 1), 14);
  const g = guardrailsFrom({ guardrails: body?.guardrails ?? {} });
  const history = Array.isArray(body?.history) ? body.history : [];
  try {
    const out = await chatAi(modules, days, g, history, message);
    return NextResponse.json({
      markdown: out.markdown,
      model: out.model,
      at: new Date(out.at).toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ai failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
