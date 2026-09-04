import type { IncidentInput } from "./incident-validation";
import { getSupabaseServerClient } from "./supabase-server";

export type Incident = IncidentInput & {
  id: string;
  reference_number: string;
  status: "NEW" | "ACKNOWLEDGED" | "IN_PROGRESS" | "ESCALATED" | "RESOLVED" | "CLOSED";
  reported_at: string;
  updated_at: string;
};

export async function listIncidents(): Promise<Incident[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("incidents")
    .select("*")
    .order("reported_at", { ascending: false });

  if (error) throw error;
  return data as Incident[];
}

export async function findIncident(referenceNumber: string): Promise<Incident | undefined> {
  const { data, error } = await getSupabaseServerClient()
    .from("incidents")
    .select("*")
    .eq("reference_number", referenceNumber)
    .maybeSingle();

  if (error) throw error;
  return data as Incident | undefined;
}

export async function createIncident(input: IncidentInput): Promise<Incident> {
  const { data, error } = await getSupabaseServerClient()
    .from("incidents")
    .insert({
      ...input,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      location_name: input.location_name ?? null,
      transcript: input.transcript ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Incident;
}
