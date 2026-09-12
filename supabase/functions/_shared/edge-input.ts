const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonObject = Record<string, unknown>;

export interface ApplicationTriggerRecord {
  id: string;
  internship_id: string;
  user_id: string;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match?.[1] ?? null;
}

export function canonicalApplicationUrl(
  internship: JsonObject,
): string | null {
  const candidates = [
    internship.direct_link,
    internship.application_link,
    internship.apply_url,
    internship.direct_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || candidate.trim() === "") continue;
    try {
      const url = new URL(candidate.trim());
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.toString();
      }
    } catch {
      // Ignore malformed database values and continue to the next canonical URL.
    }
  }
  return null;
}

export function parseApplicationTriggerPayload(
  payload: unknown,
): ApplicationTriggerRecord | null {
  if (!isObject(payload)) return null;
  const candidate = isObject(payload.record) ? payload.record : payload;

  if (
    !isUuid(candidate.id) || !isUuid(candidate.internship_id) ||
    !isUuid(candidate.user_id)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    internship_id: candidate.internship_id,
    user_id: candidate.user_id,
  };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function emailSubjectText(value: unknown, fallback: string): string {
  const text = typeof value === "string"
    ? Array.from(value, (character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 ? " " : character;
    }).join("").replace(/\s+/g, " ").trim()
    : "";
  return (text || fallback).slice(0, 120);
}

