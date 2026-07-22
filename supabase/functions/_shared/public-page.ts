const MAX_PAGE_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19));
}

export function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.+$/, "");
    if (
      !hostname || hostname === "localhost" || hostname.endsWith(".localhost")
    ) {
      return false;
    }
    if (
      hostname.endsWith(".local") || hostname.endsWith(".internal") ||
      hostname.endsWith(".home") || hostname === "metadata.google.internal"
    ) return false;
    if (isPrivateIpv4(hostname)) return false;
    if (hostname.startsWith("::ffff:")) return false;
    if (
      hostname === "::" || hostname === "::1" ||
      /^f[cd]/i.test(hostname) || /^fe[89ab]/i.test(hostname)
    ) return false;
    return hostname.includes(".") || hostname.includes(":");
  } catch {
    return false;
  }
}

async function readTextLimited(
  response: Response,
  maxBytes = MAX_PAGE_BYTES,
): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    throw new Error("Posting response is too large");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel("Posting response is too large");
      throw new Error("Posting response is too large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function fetchPublicPage(rawUrl: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let currentUrl = rawUrl;
  try {
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
      if (!isSafePublicUrl(currentUrl)) throw new Error("Unsafe posting URL");
      const page = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RaiderMatchBot/1.0)",
        },
        redirect: "manual",
      });
      if ([301, 302, 303, 307, 308].includes(page.status)) {
        const location = page.headers.get("location");
        if (!location) return { status: page.status, html: "" };
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      return {
        status: page.status,
        html: page.ok ? await readTextLimited(page) : "",
      };
    }
    throw new Error("Posting redirected too many times");
  } finally {
    clearTimeout(timer);
  }
}
