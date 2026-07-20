const EXTERNAL_APPLICATION_TYPE = "raidermatch.external-application";
const EXTERNAL_APPLICATION_VERSION = 1;

export interface ExternalApplicationEnvelope {
  type: typeof EXTERNAL_APPLICATION_TYPE;
  version: typeof EXTERNAL_APPLICATION_VERSION;
  company: string;
  roleTitle: string;
  url: string | null;
  location: string | null;
  deadline: string | null;
  note: string | null;
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

export function encodeExternalApplicationNote(
  value: Omit<ExternalApplicationEnvelope, "type" | "version">,
): string {
  return JSON.stringify({
    ...value,
    type: EXTERNAL_APPLICATION_TYPE,
    version: EXTERNAL_APPLICATION_VERSION,
  } satisfies ExternalApplicationEnvelope);
}

export function parseExternalApplicationNote(value: string | null): ExternalApplicationEnvelope | null {
  if (!value) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const url = nullableString(record.url);
  const location = nullableString(record.location);
  const deadline = nullableString(record.deadline);
  const note = nullableString(record.note);

  if (
    record.type !== EXTERNAL_APPLICATION_TYPE
    || record.version !== EXTERNAL_APPLICATION_VERSION
    || typeof record.company !== "string"
    || typeof record.roleTitle !== "string"
    || url === undefined
    || location === undefined
    || deadline === undefined
    || note === undefined
  ) {
    return null;
  }

  return {
    type: EXTERNAL_APPLICATION_TYPE,
    version: EXTERNAL_APPLICATION_VERSION,
    company: record.company,
    roleTitle: record.roleTitle,
    url,
    location,
    deadline,
    note,
  };
}
