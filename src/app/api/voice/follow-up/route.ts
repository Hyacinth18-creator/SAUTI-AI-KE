import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({ transcript: z.string().trim().min(10).max(12000) });
const assemblyAiUrl = "https://api.assemblyai.com/lemur/v3/generate/task";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AssemblyAI is not configured" }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid follow-up request" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "A transcript is required" }, { status: 400 });

  try {
    const response = await fetch(assemblyAiUrl, {
      method: "POST",
      headers: { authorization: apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        input_text: parsed.data.transcript,
        prompt: "Read the community incident transcript. Generate exactly one short, natural follow-up question that asks for the single most important missing detail needed to act on this report. Make it specific to the incident, not generic. Return only the question, with no introduction or explanation.",
        final_model: "anthropic/claude-3-5-sonnet",
        max_output_size: 120,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return NextResponse.json({ error: "AssemblyAI could not generate a follow-up" }, { status: 502 });
    const result = (await response.json()) as { response?: string };
    const question = result.response?.trim();
    if (!question) return NextResponse.json({ error: "AssemblyAI returned no follow-up question" }, { status: 502 });
    return NextResponse.json({ question: question.replace(/^[-\s]+/, "") });
  } catch {
    return NextResponse.json({ error: "AssemblyAI follow-up is temporarily unavailable" }, { status: 502 });
  }
}
