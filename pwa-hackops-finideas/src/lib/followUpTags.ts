/**
 * Single source of truth for follow-up tags (backend only).
 * Used by: assignTagsFromTranscript (Gemini), API leads route, Payload collection.
 * Frontend does not define tags — it only displays what the API returns.
 */

export const FOLLOW_UP_TAG_VALUES = [
  "product_inquiry",
  "demo_request",
  "partnership",
  "investment_interest",
  "follow_up_call",
  "newsletter",
  "event_interest",
  "support",
] as const;

export type FollowUpTagValue = (typeof FOLLOW_UP_TAG_VALUES)[number];

export const FOLLOW_UP_TAG_LABELS: Record<FollowUpTagValue, string> = {
  product_inquiry: "Product inquiry",
  demo_request: "Demo request",
  partnership: "Partnership interest",
  investment_interest: "Investment interest",
  follow_up_call: "Follow-up call",
  newsletter: "Newsletter",
  event_interest: "Event interest",
  support: "Support",
};

export function followUpTagsToDisplay(
  values: string[] | null | undefined
): { value: string; label: string }[] {
  if (!values?.length) return [];
  return values.map((value) => ({
    value,
    label: FOLLOW_UP_TAG_LABELS[value as FollowUpTagValue] ?? value,
  }));
}
