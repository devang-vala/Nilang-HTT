import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  FOLLOW_UP_TAG_VALUES,
  type FollowUpTagValue,
} from "./followUpTags";

const TAG_LIST = FOLLOW_UP_TAG_VALUES.join(", ");

const PROMPT = `You are a classifier for a finance/ideas conference lead follow-up system.

Given a transcript of a voice note from a field conversation with a lead, choose 1 or 2 tags that best describe the intent and follow-up needed. Use sentiment and intent analysis.

Allowed tags (reply ONLY with these exact values, comma-separated):
${TAG_LIST}

Rules:
- Output exactly 1 or 2 tags, comma-separated (e.g. "demo_request, follow_up_call").
- Use only the allowed tag values above.
- If the transcript is empty, unclear, or just noise, output: follow_up_call
- No other text, no explanation.`;

/**
 * Uses Gemini to assign 1-2 follow-up tags from the transcript (sentiment/intent analysis).
 * Returns empty array if API key missing or request fails.
 */
export async function assignTagsFromTranscript(
  transcript: string
): Promise<FollowUpTagValue[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const text = (transcript || "").trim();
  if (!text) return ["follow_up_call"];

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([
      { text: PROMPT },
      { text: `Transcript:\n${text.slice(0, 4000)}` },
    ]);
    const raw = result.response.text()?.trim() ?? "";
    const chosen = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is FollowUpTagValue =>
        FOLLOW_UP_TAG_VALUES.includes(s as FollowUpTagValue)
      );
    const uniq = [...new Set(chosen)].slice(0, 2);
    return uniq.length >= 1 ? uniq : ["follow_up_call"];
  } catch (err) {
    console.error("assignTagsFromTranscript error:", err);
    return ["follow_up_call"];
  }
}
