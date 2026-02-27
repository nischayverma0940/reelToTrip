import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY, MODEL_NAME } from "../../config";
import { extractJsonSafely } from "../../utils/extractJson";

const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "travel-agent/1.0 (education project)";

export interface ReelInsight {
  destination: string;
  country: string;
  vibe: string[];
  key_activities: string[];
}

export interface DestinationResearchResult {
  destination: string;
  local_attractions: string[];
  recommended_duration_days: number;
  confidence: "low" | "medium" | "high";
}

function parseCity(destination: string): string {
  if (destination.includes(",")) {
    return destination.split(",").pop()!.trim();
  }
  return destination.trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function nominatimLookup(
  query: string
): Promise<{ lat: number; lon: number } | null> {
  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;

    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function getCityCoordinates(
  destination: string,
  city: string,
  country: string
): Promise<{ lat: number; lon: number } | null> {
  const queries = [
    `${city}, ${country}`,
    `${destination}, ${country}`,
    destination,
    city,
    country,
  ];

  for (const q of queries) {
    console.log(`[geocode] Trying: "${q}"`);
    const result = await nominatimLookup(q);
    if (result) {
      console.log(`[geocode] Found: lat=${result.lat}, lon=${result.lon}`);
      return result;
    }
    await delay(1100);
  }

  console.warn(
    `[geocode] All lookups failed for destination="${destination}", city="${city}", country="${country}"`
  );
  return null;
}

async function getNearbyAttractions(
  lat: number,
  lon: number,
  radius = 5000
): Promise<string[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"](around:${radius},${lat},${lon});
      node["natural"](around:${radius},${lat},${lon});
      node["leisure"](around:${radius},${lat},${lon});
      way["tourism"](around:${radius},${lat},${lon});
    );
    out tags;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: query,
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`);

  const json = (await res.json()) as {
    elements: { tags?: { name?: string } }[];
  };

  const names = new Set<string>();
  for (const el of json.elements) {
    const name = el.tags?.name;
    if (name) names.add(name);
  }

  return Array.from(names);
}

export async function destinationResearchAgent(
  reelInsight: ReelInsight
): Promise<DestinationResearchResult> {
  const { destination, country, vibe, key_activities } = reelInsight;

  const city = parseCity(destination);
  const coords = await getCityCoordinates(destination, city, country);

  let attractions: string[] = [];
  if (coords) {
    attractions = await getNearbyAttractions(coords.lat, coords.lon);
  }

  const prompt = `
You are a travel research agent.

Destination: ${destination}
Country: ${country}
Vibe: ${JSON.stringify(vibe)}
Key Activities: ${JSON.stringify(key_activities)}

Nearby Attractions (raw list):
${JSON.stringify(attractions)}

TASK:
- Select the 5–7 most relevant attractions
- Recommend an ideal trip duration in days

Respond with ONLY valid JSON.

SCHEMA:
{
  "destination": string,
  "local_attractions": string[],
  "recommended_duration_days": number,
  "confidence": "low" | "medium" | "high"
}
`;

  const response = await client.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  const text = response.text ?? "";
  return extractJsonSafely(text) as DestinationResearchResult;
}
