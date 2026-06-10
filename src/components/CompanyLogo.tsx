import { useState, useCallback } from "react";

const DOMAIN_MAP: Record<string, string> = {
  'tiktok':'tiktok.com','bytedance':'bytedance.com','meta':'meta.com','google':'google.com',
  'amazon':'amazon.com','apple':'apple.com','microsoft':'microsoft.com','nvidia':'nvidia.com',
  'netflix':'netflix.com','uber':'uber.com','stripe':'stripe.com','airbnb':'airbnb.com',
  'salesforce':'salesforce.com','oracle':'oracle.com','intel':'intel.com','amd':'amd.com',
  'cisco':'cisco.com','roblox':'roblox.com','paypal':'paypal.com','figma':'figma.com',
  'datadog':'datadog.com','cloudflare':'cloudflare.com','atlassian':'atlassian.com',
  'github':'github.com','mongodb':'mongodb.com','snowflake':'snowflake.com',
  'databricks':'databricks.com','palantir':'palantir.com','okta':'okta.com',
  'veeva systems':'veeva.com','servicenow':'servicenow.com','workday':'workday.com',
  'intuit':'intuit.com','adobe':'adobe.com','t-mobile':'t-mobile.com',
  'boeing':'boeing.com','lockheed martin':'lockheedmartin.com',
  'texas instruments':'ti.com','qualcomm':'qualcomm.com',
  'electronic arts':'ea.com','box':'box.com','dropbox':'dropbox.com',
  'spotify':'spotify.com','snap':'snap.com','notion':'notion.so',
  'tesla':'tesla.com','ford':'ford.com','capital one':'capitalone.com',
  'deloitte':'deloitte.com','jpmorgan chase':'jpmorgan.com',
  'goldman sachs':'goldmansachs.com','morgan stanley':'morganstanley.com',
  'udemy':'udemy.com','nokia':'nokia.com','siemens':'siemens.com',
  'honeywell':'honeywell.com','fanatics':'fanatics.com',
};

export function toDomain(company: string): string {
  const key = company.toLowerCase().trim();
  if (DOMAIN_MAP[key]) return DOMAIN_MAP[key];
  const slug = key.replace(/\b(inc|llc|ltd|corp|co|group|technologies|solutions|systems|company|the)\b/gi, '').replace(/[^a-z0-9]/g, '').trim();
  return slug ? `${slug}.com` : '';
}

const COLORS = ['#CC0000','#1a56db','#047857','#7c3aed','#b45309','#0e7490','#be185d','#4338ca','#0f766e','#9333ea'];

export function CompanyLogo({ company, size = 40 }: { company: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const domain = toDomain(company);
  const initial = company.charAt(0).toUpperCase();
  let hash = 0;
  for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash);
  const color = COLORS[Math.abs(hash) % COLORS.length];
  const onErr = useCallback(() => setFailed(true), []);

  if (failed || !domain) {
    return (
      <div className="rounded-lg flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.4 }}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
      alt=""
      className="rounded-lg object-contain bg-white border border-border/40 p-0.5 shrink-0"
      style={{ width: size, height: size }}
      loading="lazy"
      onError={onErr}
    />
  );
}

export function timeAgo(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function isNew(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) < 48 * 60 * 60 * 1000;
}