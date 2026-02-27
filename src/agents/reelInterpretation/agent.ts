import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY, MODEL_NAME } from "../../config";
import { fetchReelCaptionSafe } from "../../utils/fetchReelCaption";
import { extractJsonSafely } from "../../utils/extractJson";

const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export interface ReelInterpretationResult {
  destination: string;
  country: string;
  vibe: string[];
  key_activities: string[];
  confidence: "low" | "medium" | "high";
}

export async function reelInterpretationAgent(reelUrl: string): Promise<ReelInterpretationResult> {
  let caption = await fetchReelCaptionSafe(reelUrl);
  if (!caption) {
    caption = " ";
  }

  const prompt = `
You are a travel intelligence agent.

Instagram data may be partially available.
Infer the travel destination and intent from the provided context.

Respond with ONLY valid JSON.

Reel URL:
${reelUrl}

Caption:
${caption}

JSON SCHEMA:

{
  "destination": string,
  "country": string,
  "vibe": string[],
  "key_activities": string[],
  "confidence": "low" | "medium" | "high"
}
`;

  const response = await client.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  const text = response.text ?? "";
  return extractJsonSafely(text) as ReelInterpretationResult;
}
