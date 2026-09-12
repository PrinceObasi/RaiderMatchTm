export type ValidationVerdict = "valid" | "invalid" | "inconclusive";

export interface PageClassification {
  verdict: ValidationVerdict;
  message: string;
}

const DEAD_POSTING_PATTERNS = [
  /\bposition\b.{0,40}\b(filled|closed|removed)\b/i,
  /\b(job|role|application)\b.{0,40}\b(no longer available|closed|expired|removed)\b/i,
  /\bthis (job|position|role) (is|has been) no longer available\b/i,
];

export function classifyPostingPage(
  status: number,
  html: string,
): PageClassification {
  if (status === 404 || status === 410) {
    return { verdict: "invalid", message: `Posting returned HTTP ${status}` };
  }

  if (status >= 200 && status < 300 && status !== 204) {
    const sample = html.slice(0, 20_000);
    if (DEAD_POSTING_PATTERNS.some((pattern) => pattern.test(sample))) {
      return {
        verdict: "invalid",
        message: "Posting page contains a definitive closed-position marker",
      };
    }
    return { verdict: "valid", message: "Posting page is accessible" };
  }

  return {
    verdict: "inconclusive",
    message: `Validation was inconclusive (HTTP ${status})`,
  };
}
