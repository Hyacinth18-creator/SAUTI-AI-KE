import { NextResponse } from "next/server";
import { createIncident, listIncidents } from "@/lib/incidents";
import { incidentInputSchema } from "@/lib/incident-validation";

export async function GET() {
  return NextResponse.json({ incidents: listIncidents() });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const result = incidentInputSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid incident details", details: result.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const incident = createIncident(result.data);
    return NextResponse.json(
      {
        success: true,
        incident_id: incident.id,
        reference_number: incident.reference_number,
        status: incident.status,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
}
