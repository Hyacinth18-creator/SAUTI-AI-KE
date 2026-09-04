import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const assemblyAiUrl = "https://api.assemblyai.com/v2";

export async function POST(request: Request) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AssemblyAI is not configured" }, { status: 503 });

  const formData = await request.formData();
  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "No microphone recording was received" }, { status: 400 });
  }

  try {
    const supportedAudioType = /^audio\/(webm|mp4|ogg|wav|mpeg)(;|$)/i.test(audio.type)
      ? audio.type
      : "audio/webm";
    const uploadResponse = await fetch(`${assemblyAiUrl}/upload`, {
      method: "POST",
      headers: { authorization: apiKey, "content-type": supportedAudioType },
      body: await audio.arrayBuffer(),
      cache: "no-store",
    });
    if (!uploadResponse.ok) return NextResponse.json({ error: "AssemblyAI could not receive the recording" }, { status: 502 });

    const upload = (await uploadResponse.json()) as { upload_url?: string };
    if (!upload.upload_url) return NextResponse.json({ error: "AssemblyAI returned no recording URL" }, { status: 502 });

    const transcriptResponse = await fetch(`${assemblyAiUrl}/transcript`, {
      method: "POST",
      headers: { authorization: apiKey, "content-type": "application/json" },
      body: JSON.stringify({ audio_url: upload.upload_url, language_code: "en" }),
      cache: "no-store",
    });
    if (!transcriptResponse.ok) return NextResponse.json({ error: "AssemblyAI could not start transcription" }, { status: 502 });

    const transcriptJob = (await transcriptResponse.json()) as { id?: string };
    if (!transcriptJob.id) return NextResponse.json({ error: "AssemblyAI returned no transcription job" }, { status: 502 });

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const pollingResponse = await fetch(`${assemblyAiUrl}/transcript/${transcriptJob.id}`, {
        headers: { authorization: apiKey },
        cache: "no-store",
      });
      if (!pollingResponse.ok) return NextResponse.json({ error: "AssemblyAI transcription could not be checked" }, { status: 502 });

      const result = (await pollingResponse.json()) as { status?: string; text?: string; error?: string };
      if (result.status === "completed") return NextResponse.json({ transcript: result.text?.trim() ?? "" });
      if (result.status === "error") return NextResponse.json({ error: result.error ?? "AssemblyAI could not transcribe the recording" }, { status: 502 });
    }

    return NextResponse.json({ error: "Transcription timed out. Please try again." }, { status: 504 });
  } catch {
    return NextResponse.json({ error: "AssemblyAI is temporarily unavailable" }, { status: 502 });
  }
}
