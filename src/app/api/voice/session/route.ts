import { NextResponse } from "next/server";
import { z } from "zod";

const sessionRequestSchema = z.object({
  language: z.enum(["en", "sw"]).default("en"),
});

const defaultTokenUrl = "https://agents.assemblyai.com/v1/token";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  const tokenUrl = process.env.ASSEMBLYAI_VOICE_AGENT_TOKEN_URL || defaultTokenUrl;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice service is not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = sessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid voice session options" }, { status: 400 });
  }

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ language: parsed.data.language }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Voice service could not create a session" },
        { status: 502 },
      );
    }

    const session: unknown = await response.json();
    return NextResponse.json(session, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Voice service is temporarily unavailable" },
      { status: 502 },
    );
  }
}
