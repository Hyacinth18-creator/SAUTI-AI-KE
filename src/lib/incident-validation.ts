import { z } from "zod";

export const incidentInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  category: z.enum([
    "WATER",
    "ROADS",
    "ELECTRICITY",
    "SANITATION",
    "HEALTH",
    "SECURITY",
    "FIRE",
    "FLOODING",
    "EDUCATION",
    "ENVIRONMENT",
    "PUBLIC_SERVICES",
    "OTHER",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  location_name: z.string().trim().max(240).nullable().optional(),
  language: z.enum(["en", "sw"]).default("en"),
  transcript: z.string().max(12000).nullable().optional(),
});

export type IncidentInput = z.infer<typeof incidentInputSchema>;
