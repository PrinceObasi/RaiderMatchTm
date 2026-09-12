// Pure parser/utility functions shared between edge functions and tests.
// No Deno-specific imports — must remain compatible with Node/Vitest.

export const NON_SWE_KEYWORDS = [
  "product manager",
  "product management",
  "product intern",
  "data scientist",
  "data science intern",
  "data analyst",
  "quantitative researcher",
  "quant researcher",
  "quantitative analyst",
  "quantitative trader",
  "trading analyst",
  "trader intern",
  "hardware engineer",
  "electrical engineer",
  "firmware engineer",
  "analog engineer",
  "rf engineer",
  "mechanical engineer",
];

export const SWE_KEYWORDS = [
  "software engineer",
  "software engineering",
  "software developer",
  "swe",
  "full stack",
  "full-stack",
  "frontend engineer",
  "front end engineer",
  "backend engineer",
  "back end engineer",
  "web engineer",
  "mobile engineer",
  "ios engineer",
  "android engineer",
  "platform engineer",
  "infrastructure engineer",
  "devops engineer",
  "site reliability",
  "sre",
  "ml engineer",
  "machine learning engineer",
];

export const US_STATE_ABBREVS = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC","PR","GU","VI",
]);

export const INTERNATIONAL_PATTERNS = [
  ", UK",", Canada",", CA, Canada",", ON, Canada",", BC, Canada",
  ", Germany",", France",", Ireland",", Israel",", India",
  ", Japan",", Singapore",", Australia",", Netherlands",
  ", Sweden",", Switzerland",", Spain",", Italy",", Belgium",
  ", Poland",", Czech",", Austria",", Denmark",", Norway",
  ", Finland",", Brazil",", Mexico",", Korea",", China",
  ", Taiwan",", Hong Kong",
  "London,","Toronto,","Vancouver,","Montreal,","Dublin,",
  "Berlin,","Munich,","Tel Aviv,","Bangalore,","Hyderabad,",
  "Tokyo,","Sydney,","Melbourne,","Belfast,","Edinburgh,",
  "Glasgow,","Cardiff,","Amsterdam,","Waterloo, ON",
  "Mississauga","Ottawa,","Calgary,",", ON</",", BC</",
];

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

export function fingerprint(company: string, role: string, url?: string): string {
  const c = (company ?? "").toLowerCase().trim();
  const r = (role ?? "").toLowerCase().trim();
  let domain = "";
  if (url) {
    try {
      domain = new URL(url).hostname;
    } catch { /* ignore */ }
  }
  return domain ? `${c}::${r}::${domain}` : `${c}::${r}`;
}

export function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    return u.toString();
  } catch {
    return url;
  }
}

export function detectAts(url: string): string | null {
  const map: Record<string, string> = {
    "greenhouse.io": "greenhouse",
    "lever.co": "lever",
    "myworkdayjobs.com": "workday",
    "jobvite.com": "jobvite",
    "icims.com": "icims",
    "smartrecruiters.com": "smartrecruiters",
    "ashbyhq.com": "ashby",
    "breezy.hr": "breezy",
    "recruitee.com": "recruitee",
    "workable.com": "workable",
  };
  for (const [domain, ats] of Object.entries(map)) {
    if (url.includes(domain)) return ats;
  }
  return null;
}

export function isUSLocation(location: string): boolean {
  if (!location) return false;
  const loc = location.trim();
  if (
    /\bUSA\b/i.test(loc) || /\bUnited States\b/i.test(loc) ||
    /\bRemote in USA\b/i.test(loc) || /^Remote$/i.test(loc)
  ) return true;
  for (const pattern of INTERNATIONAL_PATTERNS) {
    if (loc.includes(pattern)) return false;
  }
  const stateMatches = loc.match(/\b([A-Z]{2})\b/g);
  if (stateMatches) {
    for (const abbr of stateMatches) {
      if (US_STATE_ABBREVS.has(abbr)) return true;
    }
  }
  const stateNames = [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado",
    "Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho",
    "Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
    "Maine","Maryland","Massachusetts","Michigan","Minnesota",
    "Mississippi","Missouri","Montana","Nebraska","Nevada",
    "New Hampshire","New Jersey","New Mexico","New York",
    "North Carolina","North Dakota","Ohio","Oklahoma","Oregon",
    "Pennsylvania","Rhode Island","South Carolina","South Dakota",
    "Tennessee","Texas","Utah","Vermont","Virginia","Washington",
    "West Virginia","Wisconsin","Wyoming",
  ];
  for (const name of stateNames) if (loc.includes(name)) return true;
  const usCityShorthands = ["NYC","SF","LA","DMV","Bay Area","Silicon Valley"];
  for (const city of usCityShorthands) if (loc.includes(city)) return true;
  return false;
}

export function roleFilter(roleText: string): "swe" | "non_swe" {
  const titleLower = roleText.toLowerCase();
  const isNonSwe = NON_SWE_KEYWORDS.some((kw) => titleLower.includes(kw));
  const hasSweKeyword = SWE_KEYWORDS.some((kw) => titleLower.includes(kw));
  return (isNonSwe || !hasSweKeyword) ? "non_swe" : "swe";
}

export function parsePostedDate(raw: string, referenceDate?: Date): string | null {
  const m = raw.trim().match(/^([A-Z][a-z]{2})\s+(\d{1,2})$/);
  if (!m || !MONTHS[m[1]]) return null;
  const now = referenceDate ?? new Date();
  let year = now.getFullYear();
  const month = MONTHS[m[1]];
  if (month > now.getMonth() + 1) year -= 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(+m[2]).padStart(2, "0")}`;
}
