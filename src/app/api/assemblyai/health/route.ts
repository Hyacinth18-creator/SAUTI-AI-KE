import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ configured: false, connected: false }, { status: 503 });
  }

  try {
    const response = await fetch("https://api.assemblyai.com/v2/transcript?limit=1", {
      headers: { authorization: apiKey },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    return NextResponse.json(
      { configured: true, connected: response.ok },
      { status: response.ok ? 200 : 502 },
    );
  } catch {
    return NextResponse.json({ configured: true, connected: false }, { status: 502 });
  }
}
