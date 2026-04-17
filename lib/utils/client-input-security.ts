/**
 * Client-side input hardening helpers (defense in depth).
 * Server must still validate; see prd-files/clientside-cybersecurity.md
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Remove HTML-like angle brackets and strip common tag patterns (plaintext-only fields). */
export function stripHtmlLikeContent(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/</g, "").replace(/>/g, "");
}

/** Remove ASCII control characters except tab/newline for summary textareas if needed. */
export function stripControlCharsExceptNewline(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function sanitizePlainTextLine(value: string, maxLength: number): string {
  const s = stripControlChars(stripHtmlLikeContent(value)).trim();
  return s.slice(0, maxLength);
}

/** Like `sanitizePlainTextLine` but keeps leading/trailing spaces (e.g. experience highlight copy). */
export function sanitizePlainTextLinePreserveSpace(value: string, maxLength: number): string {
  return stripControlChars(stripHtmlLikeContent(value)).slice(0, maxLength);
}

export function sanitizePlainTextMultiline(value: string, maxLength: number): string {
  const s = stripControlCharsExceptNewline(stripHtmlLikeContent(value)).trim();
  return s.slice(0, maxLength);
}

export function isUuid(value: string): boolean {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/**
 * Optional proof URL: empty ok; otherwise must be parseable http(s) URL, no javascript/data, reasonable length.
 */
export function sanitizeOptionalHttpUrl(raw: string, maxLength = 500): string {
  const trimmed = stripControlChars(stripHtmlLikeContent(raw)).trim().slice(0, maxLength);
  if (!trimmed) return "";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "";
  }
  const protocol = url.protocol.toLowerCase();
  if (protocol !== "https:" && protocol !== "http:") {
    return "";
  }
  if (protocol === "http:") {
    const host = url.hostname.toLowerCase();
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "";
    }
  }
  return url.toString().slice(0, maxLength);
}

/** Search query for GET param: short, no HTML, no control chars. */
export function sanitizeSearchQuery(raw: string, maxLength = 200): string {
  return sanitizePlainTextLine(raw, maxLength);
}

/** Same as search query sanitization but preserves leading/trailing spaces while typing. */
export function clampSearchQueryInput(raw: string, maxLength = 200): string {
  return stripControlChars(stripHtmlLikeContent(raw)).slice(0, maxLength);
}
