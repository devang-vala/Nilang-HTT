import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio") as Blob | null;

    if (!audio || audio.size === 0) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const buffer = await audio.arrayBuffer();
    const base64Audio = Buffer.from(buffer).toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try multiple models in order of preference
    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError: Error | null = null;

    for (const modelName of models) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });

          const result = await model.generateContent([
            {
              inlineData: {
                mimeType: audio.type || "audio/webm",
                data: base64Audio,
              },
            },
            `Transcribe this audio recording accurately. Then provide:
1. A clean transcript of what was said
2. Key bullet points summary

Format:
## Transcript
[full transcript here]

## Key Points
- [bullet point 1]
- [bullet point 2]
...`,
          ]);

          const text = result.response.text();
          return NextResponse.json({ transcript: text });
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(
            `Transcription attempt ${attempt}/${MAX_RETRIES} with ${modelName} failed:`,
            lastError.message
          );

          // Don't retry on auth errors
          if (lastError.message.includes("API_KEY") || lastError.message.includes("403")) {
            break;
          }

          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * attempt);
          }
        }
      }
    }

    // All retries exhausted
    console.error("Transcription failed after all retries:", lastError);
    return NextResponse.json(
      { error: lastError?.message || "Transcription failed after retries" },
      { status: 502 }
    );
  } catch (error) {
    console.error("Transcription error:", error);
    const message =
      error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
