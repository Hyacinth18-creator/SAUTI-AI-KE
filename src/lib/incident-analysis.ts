import type { IncidentInput } from "./incident-validation";

type IncidentClassification = Pick<IncidentInput, "category" | "severity" | "title" | "location_name">;

const categoryKeywords: Array<[IncidentInput["category"], string[]]> = [
  ["WATER", ["water", "pipe", "tap", "bomba", "maji", "mavuzi"]],
  ["ROADS", ["road", "pothole", "bridge", "barabara", "shimo"]],
  ["ELECTRICITY", ["electric", "power", "light", "pole", "umeme", "stima"]],
  ["SANITATION", ["sewage", "toilet", "drain", "sanitation", "choo", "maji taka"]],
  ["HEALTH", ["hospital", "clinic", "medicine", "health", "afya"]],
  ["SECURITY", ["crime", "robbery", "unsafe", "security", "usalama"]],
  ["FIRE", ["fire", "burning", "moto"]],
  ["FLOODING", ["flood", "flooding", "flooded", "mafuriko"]],
  ["EDUCATION", ["school", "classroom", "student", "shule"]],
  ["ENVIRONMENT", ["pollution", "tree", "forest", "environment", "uchafuzi"]],
  ["PUBLIC_SERVICES", ["office", "permit", "service", "county", "huduma"]],
];

function includesKeyword(text: string, keyword: string) {
  return text.includes(keyword);
}

function getCategory(text: string): IncidentInput["category"] {
  for (const [category, keywords] of categoryKeywords) {
    if (keywords.some((keyword) => includesKeyword(text, keyword))) return category;
  }
  return "OTHER";
}

function getSeverity(text: string): IncidentInput["severity"] {
  if (["death", "dead", "injury", "injured", "trapped", "fire", "emergency", "critical", "kifo", "dharura"].some((word) => includesKeyword(text, word))) {
    return "CRITICAL";
  }
  if (["danger", "dangerous", "urgent", "blocked", "overflowing", "flood", "stolen", "hatari", "imeziba"].some((word) => includesKeyword(text, word))) {
    return "HIGH";
  }
  if (["broken", "leak", "leaking", "damaged", "missing", "broken", "imeharibika"].some((word) => includesKeyword(text, word))) {
    return "MEDIUM";
  }
  return "LOW";
}

function getTitle(transcript: string, category: IncidentInput["category"]) {
  const sentence = transcript.split(/[.!?\n]/, 1)[0]?.trim() ?? "Community report";
  const title = sentence || `${category.replaceAll("_", " ")} report`;
  return title.length > 120 ? `${title.slice(0, 117)}...` : title;
}

function getLocation(transcript: string) {
  const match = transcript.match(/(?:near|at|along|in|outside|karibu na|kwenye)\s+([^,.!?\n]+)/i);
  return match?.[1]?.trim().slice(0, 240) || null;
}

export function analyzeIncident(transcript: string): IncidentClassification {
  const normalized = transcript.toLocaleLowerCase();
  const category = getCategory(normalized);

  return {
    title: getTitle(transcript, category),
    category,
    severity: getSeverity(normalized),
    location_name: getLocation(transcript),
  };
}