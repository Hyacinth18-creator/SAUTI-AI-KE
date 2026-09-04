import { NextResponse } from "next/server";
import { createIncident, listIncidents } from "@/lib/incidents";
import { incidentInputSchema } from "@/lib/incident-validation";

export async function GET() {
  return NextResponse.json({ incidents: await listIncidents() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const result = incidentInputSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid incident details", details: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const incident = await createIncident(result.data);
    return NextResponse.json(
      {
        success: true,
        incident_id: incident.id,
        reference_number: incident.reference_number,
        status: incident.status,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Incident creation failed", error);
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      { error: "Unable to save incident right now", code: message.includes("not configured") ? "SUPABASE_NOT_CONFIGURED" : "DATABASE_INSERT_FAILED" },
      { status: 503 },
    );
  }
}
