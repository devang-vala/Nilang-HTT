export function validateQRData(raw: string) {
  if (!raw) {
    return { valid: false, reason: "Empty QR data" };
  }

  // limit size to prevent payload abuse
  if (raw.length > 1000) {
    return { valid: false, reason: "QR data too large" };
  }

  // block javascript protocol attacks
  const lower = raw.toLowerCase().trim();
  if (lower.startsWith("javascript:")) {
    return { valid: false, reason: "Blocked dangerous protocol" };
  }

  // detect URL
  try {
    const url = new URL(raw);

    // allow only safe protocols
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { valid: false, reason: "Unsupported URL protocol" };
    }

    return {
      valid: true,
      type: "url",
      data: url.href,
    };
  } catch {
    // not URL → treat as plain text
  }

  // basic text sanitization
  const safeText = raw.replace(/[<>]/g, "");

  return {
    valid: true,
    type: "text",
    data: safeText,
  };
}
