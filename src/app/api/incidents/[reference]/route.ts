import { NextResponse } from "next/server";
import { findIncident } from "@/lib/incidents";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ reference: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { reference } = await params;
  const incident = findIncident(reference.toUpperCase());

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  return NextResponse.json({ incident });
}
