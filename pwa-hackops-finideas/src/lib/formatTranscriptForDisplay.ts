/**
 * Cleans transcript text for UI: removes "## Transcript", "## Key Points" and the key points section.
 * Leaves just the main transcript body for a cleaner display.
 */
function formatTranscriptForDisplay(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  let text = raw.trim();
  text = text.replace(/^##\s*Transcript\s*\n?/i, "");
  const keyPointsIndex = text.search(/\n##\s*Key\s*Points\s*\n?/i);
  if (keyPointsIndex !== -1) {
    text = text.slice(0, keyPointsIndex);
  }
  return text.trim();
}

/**
 * Extracts key points from raw transcript (the bullet list under "## Key Points").
 * Returns an array of trimmed strings, or empty array if none.
 */
function extractKeyPointsFromTranscript(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== "string") return [];
  const match = raw.match(/\n##\s*Key\s*Points\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (!match) return [];
  const block = match[1].trim();
  return block
    .split(/\n/)
    .map((line) => line.replace(/^[\s*\-–—]+\s*/, "").trim())
    .filter(Boolean);
}

export { formatTranscriptForDisplay, extractKeyPointsFromTranscript };
