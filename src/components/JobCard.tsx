import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  Link2,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buildExplanation } from "@/lib/hireScoreExplain";
import { getReadinessCategory } from "@/lib/hireScore";
import { cn } from "@/lib/utils";
import { firstValidHttpUrl, normalizeHttpUrl } from "@/lib/httpUrl";

import { CompanyLogo, isNew, timeAgo } from "./CompanyLogo";

export interface JobCardJob {
  id: string;
  title: string;
  company: string;
  company_logo?: string | null;
  city?: string | null;
  description?: string | null;
  summary_text?: string | null;
  skills?: string[] | null;
  matched_skills?: string[] | null;
  missing_skills?: string[] | null;
  apply_url?: string | null;
  posted_date?: string | null;
  date_posted?: string | null;
  job_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_period?: string | null;
  requires_us_citizenship?: boolean;
  requires_clearance?: string | null;
  ineligible?: boolean;
  deadline?: string | null;
  work_mode?: string | null;
  source?: string | null;
  direct_link?: string | null;
  is_ttu_connected?: boolean;
}

export type JobTrackingStatus =
  | null
  | "saved"
  | "applied"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "no_response";

export interface JobCardProps {
  job: JobCardJob;
  trackingStatus: JobTrackingStatus;
  isUpdating?: boolean;
  previousInternship?: boolean;
  projectDepth?: number;
  onSave: (job: JobCardJob) => void;
  onApply: (job: JobCardJob) => void;
  onMarkApplied: (job: JobCardJob) => void;
  featured?: boolean;
}

const readinessStyles = {
  strong:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  possible:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  stretch:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ineligible:
    "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
} as const;

const trackingLabels: Record<Exclude<JobTrackingStatus, null>, string> = {
  saved: "Saved",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  no_response: "No Response",
};

const trackingStyles: Record<Exclude<JobTrackingStatus, null>, string> = {
  saved: "border-primary/20 bg-primary/5 text-primary",
  applied: "border-blue-200 bg-blue-50 text-blue-800",
  assessment: "border-violet-200 bg-violet-50 text-violet-800",
  interview: "border-amber-200 bg-amber-50 text-amber-800",
  offer: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  withdrawn: "border-slate-200 bg-slate-50 text-slate-700",
  no_response: "border-slate-200 bg-slate-50 text-slate-700",
};

const DAY_IN_MS = 86_400_000;

function cleanList(values: string[] | null | undefined): string[] {
  const seen = new Set<string>();

  return (values ?? []).filter((value) => {
    const normalized = value.trim().toLocaleLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const parsed = new Date(dateOnly ? `${value.trim()}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCalendarDate(date: Date): string {
  const includeYear = date.getFullYear() !== new Date().getFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(date);
}

function getDeadlineInfo(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) {
    return {
      label: "Deadline not listed",
      detail: "The employer has not supplied an application deadline.",
      className: "",
    };
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const deadlineStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const daysRemaining = Math.round(
    (deadlineStart.getTime() - todayStart.getTime()) / DAY_IN_MS,
  );
  const formattedDate = formatCalendarDate(date);

  if (daysRemaining < 0) {
    return {
      label: `Deadline passed ${formattedDate}`,
      detail: `The listed deadline was ${formattedDate}. Check the original posting before applying.`,
      className: "text-destructive",
    };
  }

  if (daysRemaining === 0) {
    return {
      label: "Due today",
      detail: `The listed deadline is today, ${formattedDate}.`,
      className: "text-amber-700 dark:text-amber-300",
    };
  }

  if (daysRemaining === 1) {
    return {
      label: "Due tomorrow",
      detail: `The listed deadline is tomorrow, ${formattedDate}.`,
      className: "text-amber-700 dark:text-amber-300",
    };
  }

  if (daysRemaining <= 14) {
    return {
      label: `Due in ${daysRemaining} days`,
      detail: `The listed deadline is ${formattedDate}.`,
      className: "text-amber-700 dark:text-amber-300",
    };
  }

  return {
    label: `Due ${formattedDate}`,
    detail: `The listed deadline is ${formattedDate}.`,
    className: "",
  };
}

function humanize(value: string): string {
  const words = value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!words) return "";
  if (words.toLocaleLowerCase() === "ttu") return "TTU";
  return words.charAt(0).toLocaleUpperCase() + words.slice(1);
}

function formatSalary(
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined,
  salaryPeriod: string | null | undefined,
): string | null {
  const normalizedPeriod = salaryPeriod?.trim().toLocaleLowerCase();
  const isAnnual = [
    "year",
    "yearly",
    "annual",
    "annually",
    "yr",
  ].includes(normalizedPeriod ?? "");
  const validAmount = (amount: number | null | undefined) =>
    typeof amount === "number" && Number.isFinite(amount) && amount >= 0
      ? isAnnual && amount > 0 && amount < 1_000
        ? amount * 1_000
        : amount
      : undefined;
  const min = validAmount(salaryMin);
  const max = validAmount(salaryMax);

  if (min === undefined && max === undefined) return null;

  const formatAmount = (amount: number) => {
    const hasCents = !Number.isInteger(amount);
    return `$${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    }).format(amount)}`;
  };

  let range: string;
  if (min !== undefined && max !== undefined) {
    range =
      min === max
        ? formatAmount(min)
        : `${formatAmount(Math.min(min, max))}–${formatAmount(Math.max(min, max))}`;
  } else if (min !== undefined) {
    range = `${formatAmount(min)}+`;
  } else {
    range = `Up to ${formatAmount(max as number)}`;
  }

  const period =
    normalizedPeriod === "hour" || normalizedPeriod === "hourly" || normalizedPeriod === "hr"
      ? "hr"
      : normalizedPeriod === "year" ||
          normalizedPeriod === "yearly" ||
          normalizedPeriod === "annual" ||
          normalizedPeriod === "annually" ||
          normalizedPeriod === "yr"
        ? "yr"
        : normalizedPeriod === "month" || normalizedPeriod === "monthly"
          ? "mo"
          : normalizedPeriod === "week" || normalizedPeriod === "weekly"
            ? "wk"
            : normalizedPeriod === "day" || normalizedPeriod === "daily"
              ? "day"
              : normalizedPeriod
                ? humanize(normalizedPeriod).toLocaleLowerCase()
                : null;

  return period ? `${range} / ${period}` : range;
}

function getHostname(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function getEligibility(job: JobCardJob) {
  const rawClearance = job.requires_clearance?.trim();
  const clearanceIsRequired = Boolean(
    rawClearance &&
      !["no", "none", "not required", "n/a"].includes(
        rawClearance.toLocaleLowerCase(),
      ),
  );
  const requirements = [
    job.requires_us_citizenship ? "U.S. citizenship" : null,
    clearanceIsRequired ? `${rawClearance} clearance` : null,
  ].filter((requirement): requirement is string => Boolean(requirement));

  if (job.ineligible) {
    const reason = requirements.length
      ? `This role requires ${requirements.join(" and ")}, which appears to conflict with your profile.`
      : "One or more required qualifications appear to conflict with your profile.";
    return { label: "Not eligible", detail: reason, restricted: true };
  }

  if (requirements.length) {
    return {
      label: "Review eligibility",
      detail: `The employer lists ${requirements.join(" and ")} as required. Confirm that you qualify before applying.`,
      restricted: true,
    };
  }

  return {
    label: "No restrictions listed",
    detail:
      "No citizenship or security-clearance requirement is listed. Confirm all qualifications in the original posting.",
    restricted: false,
  };
}

function JobLogo({ job }: { job: JobCardJob }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const logoUrl = job.company_logo?.trim();

  if (logoUrl && logoUrl !== failedUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-xl border bg-white object-contain p-1"
        loading="lazy"
        onError={() => setFailedUrl(logoUrl)}
      />
    );
  }

  return <CompanyLogo company={job.company} size={56} />;
}

function MetaItem({
  icon: Icon,
  label,
  title,
  className,
}: {
  icon: LucideIcon;
  label: string;
  title?: string;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
      title={title}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </li>
  );
}

export function JobCard({
  job,
  trackingStatus,
  isUpdating = false,
  previousInternship = false,
  projectDepth = 0,
  onSave,
  onApply,
  onMarkApplied,
  featured = false,
}: JobCardProps) {
  const matchedSkills = cleanList(job.matched_skills);
  const missingSkills = cleanList(job.missing_skills);
  const totalSkills =
    cleanList(job.skills).length || matchedSkills.length + missingSkills.length;
  const readiness = getReadinessCategory(
    matchedSkills,
    missingSkills,
    totalSkills,
    job.ineligible,
  );
  const eligibility = getEligibility(job);
  const explanation = buildExplanation({
    category: readiness.category,
    matchedSkills,
    missingSkills,
    prevIntern: previousInternship,
    projectDepth: Math.max(0, Math.min(1, projectDepth)),
    eligibilityReason: job.ineligible ? eligibility.detail : undefined,
  });

  const postDate = job.date_posted || job.posted_date;
  const parsedPostDate = parseDate(postDate);
  const freshness = parsedPostDate
    ? parsedPostDate.getTime() > Date.now()
      ? `Scheduled ${formatCalendarDate(parsedPostDate)}`
      : timeAgo(postDate ?? "")
    : "Date not listed";
  const postedOn = parsedPostDate
    ? `Posted ${formatCalendarDate(parsedPostDate)}`
    : "Posting date not listed";
  const freshPosting = Boolean(
    parsedPostDate &&
      parsedPostDate.getTime() <= Date.now() &&
      isNew(postDate),
  );
  const deadline = getDeadlineInfo(job.deadline);
  const salary = formatSalary(
    job.salary_min,
    job.salary_max,
    job.salary_period,
  );
  const sourceLabel = job.source?.trim() ? humanize(job.source) : null;
  const directLink = normalizeHttpUrl(job.direct_link);
  const applicationUrl = firstValidHttpUrl(directLink, job.apply_url);
  const applicationHost = getHostname(applicationUrl);
  const sourceSummary =
    sourceLabel || (directLink ? "Direct employer link" : "Source not listed");
  const roleType = [job.work_mode?.trim(), job.job_type?.trim()]
    .filter((value): value is string => Boolean(value))
    .filter(
      (value, index, values) =>
        values.findIndex(
          (candidate) =>
            candidate.toLocaleLowerCase() === value.toLocaleLowerCase(),
        ) === index,
    )
    .map(humanize)
    .join(" · ");
  const summary =
    job.summary_text?.trim() ||
    job.description?.trim() ||
    "A description has not been provided yet.";
  const isSaved = trackingStatus === "saved";
  const isApplicationTracked =
    trackingStatus !== null && trackingStatus !== "saved";
  const isAlreadyTracked = trackingStatus !== null;
  const canApply = Boolean(applicationUrl) && !job.ineligible;
  const applyDisabledReason = job.ineligible
    ? eligibility.detail
    : !applicationUrl
      ? "No application link is available for this role."
      : undefined;

  const sourceTrustText = job.is_ttu_connected
    ? `RaiderMatch identified this as a TTU-connected opportunity${
        sourceLabel ? ` from ${sourceLabel}` : ""
      }. Confirm the role details on the destination site before submitting.`
    : directLink
      ? `This role includes a direct application link${
          applicationHost ? ` to ${applicationHost}` : ""
        }. Confirm the employer and role details before sharing personal information.`
      : sourceLabel
        ? `This listing was sourced from ${sourceLabel}${
            applicationHost ? ` and opens ${applicationHost}` : ""
          }. Review the destination carefully before submitting.`
        : "The original source is not listed. Review the destination carefully and confirm the employer before submitting.";

  const appliedButtonLabel = isApplicationTracked
    ? `Application for ${job.title} is tracked as ${trackingLabels[trackingStatus]}`
    : `Mark ${job.title} at ${job.company} as applied`;

  const applyButton = (
    <Button
      type="button"
      disabled={!canApply}
      onClick={() => onApply(job)}
      aria-label={`Apply to ${job.title} at ${job.company}`}
      title={applyDisabledReason}
    >
      Apply
      <ExternalLink aria-hidden="true" />
    </Button>
  );

  const markAppliedButton = (
    <Button
      type="button"
      variant="secondary"
      disabled={isUpdating || isApplicationTracked || Boolean(job.ineligible)}
      onClick={() => onMarkApplied(job)}
      aria-label={appliedButtonLabel}
      aria-pressed={isApplicationTracked}
      title={job.ineligible ? eligibility.detail : undefined}
    >
      {isApplicationTracked ? (
        <CheckCircle2 aria-hidden="true" />
      ) : (
        <Check aria-hidden="true" />
      )}
      I Applied
    </Button>
  );

  return (
    <Sheet>
      <Card
        className={cn(
          "w-full min-w-0 max-w-full overflow-hidden rounded-2xl border-border/80 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md",
          featured && "border-primary/40 shadow-sm ring-1 ring-primary/10",
        )}
        aria-busy={isUpdating}
      >
        {featured && <div className="h-1 bg-primary" aria-hidden="true" />}

        <CardContent className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <JobLogo job={job} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-semibold leading-snug tracking-tight sm:text-xl">
                    {job.title}
                  </h3>
                  <p className="mt-1 font-medium text-foreground/75">
                    {job.company}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {featured && (
                    <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
                      <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                      Featured
                    </Badge>
                  )}
                  {freshPosting && (
                    <Badge className="border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-50">
                      New
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold",
                      readinessStyles[readiness.category],
                    )}
                  >
                    {readiness.label}
                  </Badge>
                  {trackingStatus && (
                    <Badge
                      variant="outline"
                      className={trackingStyles[trackingStatus]}
                    >
                      {trackingLabels[trackingStatus]}
                    </Badge>
                  )}
                </div>
              </div>

              <ul
                className="mt-4 flex flex-wrap gap-x-4 gap-y-2"
                aria-label="Job details"
              >
                <MetaItem
                  icon={MapPin}
                  label={job.city?.trim() || "Location not listed"}
                />
                {roleType && <MetaItem icon={BriefcaseBusiness} label={roleType} />}
                {salary && <MetaItem icon={Banknote} label={salary} />}
                <MetaItem
                  icon={Clock3}
                  label={`Posted ${freshness}`}
                  title={postedOn}
                />
                <MetaItem
                  icon={CalendarDays}
                  label={deadline.label}
                  title={deadline.detail}
                  className={deadline.className}
                />
                <MetaItem icon={Link2} label={sourceSummary} />
                <MetaItem
                  icon={ShieldCheck}
                  label={eligibility.label}
                  title={eligibility.detail}
                  className={
                    job.ineligible
                      ? "text-destructive"
                      : eligibility.restricted
                        ? "text-amber-700 dark:text-amber-300"
                        : undefined
                  }
                />
              </ul>

              <div
                className={cn(
                  "mt-4 flex gap-2 rounded-lg border px-3 py-2.5 text-sm",
                  readinessStyles[readiness.category],
                )}
              >
                <BadgeCheck
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <p className="min-w-0 break-words">{explanation.evidence}</p>
              </div>

              <p className="mt-4 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
                {summary}
              </p>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Skills you match
                  </p>
                  {matchedSkills.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {matchedSkills.slice(0, 4).map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="max-w-full truncate border-emerald-200 bg-emerald-50/70 font-medium text-emerald-800"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {matchedSkills.length > 4 && (
                        <Badge variant="secondary">
                          +{matchedSkills.length - 4} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      No matched skills identified yet.
                    </p>
                  )}
                </div>

                <div className="flex max-w-sm items-start gap-2 text-sm">
                  <AlertCircle
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      readiness.topGap
                        ? "text-amber-600"
                        : "text-emerald-600",
                    )}
                    aria-hidden="true"
                  />
                  <p>
                    <span className="font-medium">
                      {readiness.topGap ? "Priority gap: " : "Skill gap: "}
                    </span>
                    <span className="text-muted-foreground">
                      {readiness.topGap || "No priority gap identified"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-5 grid min-w-0 grid-cols-2 gap-2 border-t pt-4 sm:flex sm:flex-wrap">
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`View details for ${job.title} at ${job.company}`}
                  >
                    <Eye aria-hidden="true" />
                    View
                  </Button>
                </SheetTrigger>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUpdating || isAlreadyTracked}
                  onClick={() => onSave(job)}
                  aria-label={isSaved
                    ? `${job.title} is saved`
                    : isApplicationTracked
                      ? `${job.title} is already in your application tracker`
                      : `Save ${job.title} for later`}
                  aria-pressed={isSaved}
                >
                  {isAlreadyTracked ? (
                    <BookmarkCheck aria-hidden="true" />
                  ) : (
                    <Bookmark aria-hidden="true" />
                  )}
                  {isSaved ? "Saved" : isApplicationTracked ? "Tracked" : "Save"}
                </Button>
                {applyButton}
                {markAppliedButton}
                {isUpdating && (
                  <span className="sr-only" role="status">
                    Updating job status
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b px-6 py-6 pr-14 text-left">
          <div className="flex items-start gap-3">
            <JobLogo job={job} />
            <div className="min-w-0">
              <SheetTitle className="pr-2 text-xl leading-snug">
                {job.title}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {job.company} · {job.city?.trim() || "Location not listed"}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge
              variant="outline"
              className={readinessStyles[readiness.category]}
            >
              {readiness.label}
            </Badge>
            {trackingStatus && (
              <Badge
                variant="outline"
                className={trackingStyles[trackingStatus]}
              >
                {trackingLabels[trackingStatus]}
              </Badge>
            )}
            {job.is_ttu_connected && (
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/5 text-primary"
              >
                TTU connected
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-7 px-6 py-6">
          <section aria-labelledby={`job-${job.id}-overview`}>
            <h4
              id={`job-${job.id}-overview`}
              className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              At a glance
            </h4>
            <dl className="mt-3 grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Posted</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {parsedPostDate ? formatCalendarDate(parsedPostDate) : "Not listed"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Deadline</dt>
                <dd className={cn("mt-0.5 text-sm font-medium", deadline.className)}>
                  {deadline.label}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Work setup</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {roleType || "Not listed"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pay</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {salary || "Not listed"}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby={`job-${job.id}-description`}>
            <h4
              id={`job-${job.id}-description`}
              className="text-base font-semibold"
            >
              About the role
            </h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {job.description?.trim() || summary}
            </p>
          </section>

          <section aria-labelledby={`job-${job.id}-match`}>
            <h4 id={`job-${job.id}-match`} className="text-base font-semibold">
              Why it matches
            </h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {explanation.evidence}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2 font-medium text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Strengths
                </div>
                {readiness.topStrengths.length ? (
                  <ul className="mt-2 space-y-1.5 text-sm text-emerald-900/80">
                    {readiness.topStrengths.map((strength) => (
                      <li key={strength}>• {strength}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-emerald-900/70">
                    No matched skills are visible yet.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2 font-medium text-amber-900">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Gap to address
                </div>
                <p className="mt-2 text-sm text-amber-900/80">
                  {readiness.topGap || "No priority skill gap identified."}
                </p>
              </div>
            </div>
          </section>

          <section
            className={cn(
              "rounded-lg border p-4",
              job.ineligible
                ? "border-destructive/30 bg-destructive/5"
                : "bg-muted/30",
            )}
            aria-labelledby={`job-${job.id}-eligibility`}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck
                className={cn(
                  "mt-0.5 h-5 w-5 shrink-0",
                  job.ineligible ? "text-destructive" : "text-primary",
                )}
                aria-hidden="true"
              />
              <div>
                <h4 id={`job-${job.id}-eligibility`} className="font-semibold">
                  Eligibility · {eligibility.label}
                </h4>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {eligibility.detail}
                </p>
              </div>
            </div>
          </section>

          <section
            className="rounded-lg border border-blue-200 bg-blue-50/60 p-4"
            aria-labelledby={`job-${job.id}-source`}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"
                aria-hidden="true"
              />
              <div>
                <h4 id={`job-${job.id}-source`} className="font-semibold text-blue-950">
                  Source and link safety
                </h4>
                <p className="mt-1 text-sm leading-6 text-blue-950/75">
                  {sourceTrustText} Legitimate employers should not ask you to pay to apply.
                </p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-blue-900/60">Source</dt>
                    <dd className="font-medium text-blue-950">{sourceSummary}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-blue-900/60">Application destination</dt>
                    <dd className="break-all font-medium text-blue-950">
                      {applicationHost || "Not available"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section aria-labelledby={`job-${job.id}-actions`}>
            <h4 id={`job-${job.id}-actions`} className="text-base font-semibold">
              Recommended next steps
            </h4>
            <ol className="mt-3 space-y-3">
              {explanation.actions.map((action, index) => (
                <li key={action} className="flex gap-3 text-sm leading-6">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{action}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <SheetFooter className="sticky bottom-0 grid grid-cols-1 gap-2 border-t bg-background px-6 py-4 sm:grid-cols-2 sm:space-x-0">
          {applyButton}
          {markAppliedButton}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
