import type { IncidentInput } from "./incident-validation";

export type Incident = IncidentInput & {
  id: string;
  reference_number: string;
  status: "NEW" | "ACKNOWLEDGED" | "IN_PROGRESS" | "ESCALATED" | "RESOLVED" | "CLOSED";
  reported_at: string;
  updated_at: string;
};

type IncidentStore = { incidents: Incident[]; sequence: number };

declare global {
  var sautiIncidentStore: IncidentStore | undefined;
}

function getStore(): IncidentStore {
  globalThis.sautiIncidentStore ??= { incidents: [], sequence: 2047 };
  return globalThis.sautiIncidentStore;
}

export function listIncidents(): Incident[] {
  return [...getStore().incidents].sort((first, second) => second.reported_at.localeCompare(first.reported_at));
}

export function findIncident(referenceNumber: string): Incident | undefined {
  return getStore().incidents.find((incident) => incident.reference_number === referenceNumber);
}

export function createIncident(input: IncidentInput): Incident {
  const store = getStore();
  const now = new Date().toISOString();
  const incident: Incident = {
    ...input,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    location_name: input.location_name ?? null,
    transcript: input.transcript ?? null,
    id: crypto.randomUUID(),
    reference_number: `SAUTI-${String(++store.sequence).padStart(4, "0")}`,
    status: "NEW",
    reported_at: now,
    updated_at: now,
  };
  store.incidents.push(incident);
  return incident;
}
