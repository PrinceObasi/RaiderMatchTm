export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Accepts "octocat", "@octocat" or "https://github.com/octocat/" and returns "octocat". */
export function normalizeGithub(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/, 1)[0];
}

/** Adds https:// to bare links such as "linkedin.com/in/name" and upgrades http://. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^http:\/\//i.test(trimmed)) return trimmed.replace(/^http:/i, "https:");
  return /^https:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
