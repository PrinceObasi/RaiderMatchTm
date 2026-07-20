import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Filter,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { ApplicationList } from "./ApplicationList";
import { JobCard, type JobCardJob, type JobTrackingStatus } from "./JobCard";
import { ProfileWizard } from "./ProfileWizard";
import { isNew } from "./CompanyLogo";
import { firstValidHttpUrl } from "@/lib/httpUrl";

type StudentProfile = Database["public"]["Tables"]["students"]["Row"];
type DashboardView = "today" | "opportunities" | "applications" | "profile";
type FitFilter = "all" | "strong" | "eligible";
type SortOption = "recommended" | "newest" | "deadline";

function getResumeStoragePath(value: string | null | undefined, userId: string): string | null {
  if (!value?.trim()) return null;

  let candidate = value.trim();
  try {
    candidate = new URL(candidate).pathname;
  } catch {
    // Bucket-relative paths are expected for resume_path.
  }

  const bucketMarker = "/resumes/";
  const markerIndex = candidate.indexOf(bucketMarker);
  if (markerIndex >= 0) candidate = candidate.slice(markerIndex + bucketMarker.length);

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return null;
  }

  candidate = candidate
    .split(/[?#]/, 1)[0]
    .replace(/^\/+/, "")
    .replace(/^resumes\//, "");

  const segments = candidate.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  return segments[0] === userId && segments.length > 1 ? candidate : null;
}

function getResumeStoragePaths(profile: StudentProfile | null, userId: string): string[] {
  const paths = new Set<string>();
  const storedPath = getResumeStoragePath(profile?.resume_path, userId);
  const urlPath = getResumeStoragePath(profile?.resume_url, userId);

  if (storedPath) paths.add(storedPath);
  if (urlPath) paths.add(urlPath);
  paths.add(`${userId}/resume.pdf`);

  return Array.from(paths);
}

interface StudentDashboardProps {
  onLogout: () => void;
  onOpenSettings: () => void;
}

interface MatchResponse {
  jobs?: JobCardJob[];
}

interface RpcResult {
  success?: boolean;
  message?: string;
}

const TRACKING_STATUSES = new Set<JobTrackingStatus>([
  null,
  "saved",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "no_response",
]);

const NAV_ITEMS: Array<{
  value: DashboardView;
  label: string;
  icon: typeof Target;
}> = [
  { value: "today", label: "Today", icon: Sparkles },
  { value: "opportunities", label: "Opportunities", icon: BriefcaseBusiness },
  { value: "applications", label: "Tracker", icon: ClipboardList },
  { value: "profile", label: "Profile", icon: User },
];

function parseTrackingStatus(value: unknown): JobTrackingStatus {
  const status = typeof value === "string" ? value.toLowerCase() : null;
  return TRACKING_STATUSES.has(status as JobTrackingStatus)
    ? (status as JobTrackingStatus)
    : null;
}

function parseRpcResult(value: Json | null): RpcResult {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return {
    success: typeof value.success === "boolean" ? value.success : undefined,
    message: typeof value.message === "string" ? value.message : undefined,
  };
}

function dateValue(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function daysUntil(value?: string | null): number | null {
  const timestamp = dateValue(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.ceil((timestamp - Date.now()) / 86_400_000);
}

function formatDeadline(value?: string | null): string {
  const days = daysUntil(value);
  if (days === null) return "No deadline listed";
  if (days < 0) return "Deadline passed";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function StudentDashboard({ onLogout, onOpenSettings }: StudentDashboardProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [matches, setMatches] = useState<JobCardJob[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [fitFilter, setFitFilter] = useState<FitFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recommended");
  const [trackingStatuses, setTrackingStatuses] = useState<Record<string, JobTrackingStatus>>({});
  const [updatingJobs, setUpdatingJobs] = useState<Set<string>>(new Set());
  const [trackerSummary, setTrackerSummary] = useState<Record<string, number>>({});
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoLoadedMatches = useRef(false);
  const { toast } = useToast();

  const loadTrackerSummary = useCallback(async (userId?: string) => {
    const { data } = await supabase.rpc("get_tracker_summary", {
      p_user_id: userId,
    });

    if (!data) return;
    const summary: Record<string, number> = {};
    for (const item of data) {
      summary[item.status] = item.count;
    }
    setTrackerSummary(summary);
  }, []);

  const hydrateTrackingStatuses = useCallback(async (jobs: JobCardJob[]) => {
    if (jobs.length === 0) {
      setTrackingStatuses({});
      return;
    }

    const pairs = await Promise.all(
      jobs.map(async (job) => {
        const { data } = await supabase.rpc("check_application", {
          p_internship_id: job.id,
        });
        if (!data || Array.isArray(data) || typeof data !== "object") {
          return [job.id, null] as const;
        }
        const applied = data.applied === true;
        const status = applied ? parseTrackingStatus(data.status) ?? "applied" : null;
        return [job.id, status] as const;
      }),
    );

    setTrackingStatuses(Object.fromEntries(pairs));
  }, []);

  const loadMatches = useCallback(async (announce = true) => {
    setIsMatching(true);
    setMatchError(null);

    try {
      const { data, error } = await supabase.functions.invoke("match");
      if (error) throw error;

      const response = data as MatchResponse | null;
      const jobs = Array.isArray(response?.jobs) ? response.jobs : [];
      setMatches(jobs);
      await hydrateTrackingStatuses(jobs);

      if (announce) {
        toast({
          title: jobs.length > 0 ? "Your matches are ready" : "No new matches yet",
          description: jobs.length > 0
            ? `${jobs.length} current opportunities were selected for you.`
            : "Check back soon as new roles are added.",
        });
      }
    } catch (error) {
      console.error("Matching error:", error);
      setMatchError("We couldn't refresh your recommendations. Your tracker and profile are still available.");
      if (announce) {
        toast({
          title: "Recommendations unavailable",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
      }
    } finally {
      setIsMatching(false);
    }
  }, [hydrateTrackingStatuses, toast]);

  const loadProfile = useCallback(async () => {
    setIsProfileLoading(true);
    setProfileError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setProfileError("Your session has expired. Please sign in again.");
      setIsProfileLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      setProfileError("We couldn't load your student profile.");
    } else {
      setProfile(data);
      setHasResume(Boolean(data.resume_url || data.resume_uploaded));
      void loadTrackerSummary(session.user.id);
    }
    setIsProfileLoading(false);
  }, [loadTrackerSummary]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isProfileLoading || !hasResume || autoLoadedMatches.current) return;
    autoLoadedMatches.current = true;
    void loadMatches(false);
  }, [hasResume, isProfileLoading, loadMatches]);

  const availableCities = useMemo(() => {
    return Array.from(
      new Set(
        matches
          .map((job) => job.city)
          .filter((city): city is string => Boolean(city)),
      ),
    ).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = matches.filter((job) => {
      const matchesSearch = !query || [
        job.title,
        job.company,
        job.city,
        ...(job.skills ?? []),
      ].some((value) => value?.toLowerCase().includes(query));
      const matchesCity = cityFilter === "all" || job.city === cityFilter;

      const matchedSkills = job.matched_skills?.length ?? 0;
      const totalSkills = job.skills?.length || matchedSkills + (job.missing_skills?.length ?? 0) || 1;
      const ratio = matchedSkills / totalSkills;
      const isStrong = !job.ineligible && ratio >= 0.7 && (job.missing_skills?.length ?? 0) <= 1;
      const matchesFit = fitFilter === "all"
        || (fitFilter === "eligible" && !job.ineligible)
        || (fitFilter === "strong" && isStrong);

      return matchesSearch && matchesCity && matchesFit;
    });

    if (sortOption === "newest") {
      return [...result].sort((a, b) => {
        const aDate = dateValue(a.date_posted || a.posted_date);
        const bDate = dateValue(b.date_posted || b.posted_date);
        return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
      });
    }
    if (sortOption === "deadline") {
      return [...result].sort((a, b) => dateValue(a.deadline) - dateValue(b.deadline));
    }
    return result;
  }, [cityFilter, fitFilter, matches, searchQuery, sortOption]);

  const clearFilters = () => {
    setSearchQuery("");
    setCityFilter("all");
    setFitFilter("all");
    setSortOption("recommended");
  };

  const updateTrackingSummary = useCallback((previous: JobTrackingStatus, next: JobTrackingStatus) => {
    setTrackerSummary((current) => {
      const updated = { ...current };
      if (previous) updated[previous] = Math.max(0, (updated[previous] ?? 0) - 1);
      if (next) updated[next] = (updated[next] ?? 0) + 1;
      return updated;
    });
  }, []);

  const saveTrackingStatus = useCallback(async (job: JobCardJob, nextStatus: "saved" | "applied") => {
    const previousStatus = trackingStatuses[job.id] ?? null;
    if (previousStatus === nextStatus || (nextStatus === "saved" && previousStatus && previousStatus !== "saved")) {
      return;
    }

    setUpdatingJobs((current) => new Set(current).add(job.id));
    setTrackingStatuses((current) => ({ ...current, [job.id]: nextStatus }));
    updateTrackingSummary(previousStatus, nextStatus);

    try {
      const { data, error } = await supabase.rpc("save_application", {
        p_internship_id: job.id,
        p_status: nextStatus,
      });
      if (error) throw error;

      const result = parseRpcResult(data);
      if (result.success === false) throw new Error(result.message || "Unable to update tracker");

      toast({
        title: nextStatus === "saved" ? "Saved to your tracker" : "Application added to your tracker",
        description: nextStatus === "saved"
          ? `${job.title} is ready when you are.`
          : "Update the stage when you hear back.",
      });
    } catch (error) {
      console.error("Tracking update error:", error);
      setTrackingStatuses((current) => ({ ...current, [job.id]: previousStatus }));
      updateTrackingSummary(nextStatus, previousStatus);
      toast({
        title: "Tracker update failed",
        description: "Your change wasn't saved. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingJobs((current) => {
        const updated = new Set(current);
        updated.delete(job.id);
        return updated;
      });
    }
  }, [toast, trackingStatuses, updateTrackingSummary]);

  const handleSave = useCallback((job: JobCardJob) => {
    void saveTrackingStatus(job, "saved");
  }, [saveTrackingStatus]);

  const handleMarkApplied = useCallback((job: JobCardJob) => {
    void saveTrackingStatus(job, "applied");
  }, [saveTrackingStatus]);

  const handleApply = useCallback((job: JobCardJob) => {
    const link = firstValidHttpUrl(job.direct_link, job.apply_url);
    if (!link) {
      toast({
        title: "Application link unavailable",
        description: "We're checking this listing. Try again later.",
        variant: "destructive",
      });
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }, [toast]);

  const processResumeFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Choose a PDF", description: "Resume uploads must be PDF files.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File is too large", description: "Choose a PDF under 2 MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data, error } = await supabase.functions.invoke("upload-resume", { body: formData });
      if (error) throw error;

      const upload = data as { skills?: string[]; resume_url?: string } | null;
      setHasResume(true);
      setProfile((current) => current
        ? {
            ...current,
            resume_uploaded: true,
            resume_url: upload?.resume_url ?? current.resume_url,
            skills: upload?.skills ?? current.skills,
          }
        : current);
      autoLoadedMatches.current = true;
      await loadProfile();
      toast({
        title: "Resume ready",
        description: `We found ${upload?.skills?.length ?? 0} skills and are refreshing your matches.`,
      });
      void loadMatches(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: "We couldn't analyze that resume. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [loadMatches, loadProfile, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processResumeFile(file);
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processResumeFile(file);
  }, [processResumeFile]);

  const handleDeleteResume = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const resumePaths = getResumeStoragePaths(profile, session.user.id);
    const { error: storageError } = await supabase.storage
      .from("resumes")
      .remove(resumePaths);

    if (storageError) {
      toast({
        title: "Resume wasn't removed",
        description: "We couldn't delete the stored PDF. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({ resume_path: null, resume_url: null, resume_uploaded: false, skills: null })
      .eq("user_id", session.user.id);

    if (error) {
      toast({ title: "Resume wasn't removed", description: error.message, variant: "destructive" });
      return;
    }

    setProfile((current) => current
      ? { ...current, resume_path: null, resume_url: null, resume_uploaded: false, skills: null }
      : current);
    setHasResume(false);
    setMatches([]);
    setTrackingStatuses({});
    autoLoadedMatches.current = false;
    toast({ title: "Resume removed" });
  };

  const openResume = async () => {
    if (!profile?.user_id || !hasResume) {
      toast({ title: "Preview unavailable", description: "Upload or replace your resume to create a fresh preview." });
      return;
    }

    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;

    const resumePaths = getResumeStoragePaths(profile, profile.user_id);
    let lastError: string | null = null;

    for (const path of resumePaths) {
      const { data, error } = await supabase.storage
        .from("resumes")
        .createSignedUrl(path, 60);

      if (error || !data?.signedUrl) {
        lastError = error?.message || "The stored PDF could not be found.";
        continue;
      }

      if (previewWindow) {
        previewWindow.location.href = data.signedUrl;
      } else {
        const opened = window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          toast({ title: "Preview blocked", description: "Allow pop-ups for RaiderMatch, then try again." });
        }
      }
      return;
    }

    previewWindow?.close();
    toast({
      title: "Preview unavailable",
      description: lastError || "We couldn't create a secure resume preview.",
      variant: "destructive",
    });
  };

  const profileChecks = [
    Boolean(profile?.graduation_year),
    Boolean(profile?.location_city || profile?.location_state),
    hasResume,
    Boolean(profile?.skills?.length),
  ];
  const profileCompletion = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);
  const firstName = profile?.name?.trim().split(/\s+/)[0] || "Raider";
  const trackerTotal = Object.values(trackerSummary).reduce((sum, count) => sum + count, 0);
  const activeApplications = (trackerSummary.applied ?? 0)
    + (trackerSummary.assessment ?? 0)
    + (trackerSummary.interview ?? 0);
  const followUps = (trackerSummary.assessment ?? 0) + (trackerSummary.interview ?? 0);
  const newMatches = matches.filter((job) => isNew(job.date_posted || job.posted_date)).length;
  const localMatches = matches.filter((job) =>
    job.is_ttu_connected || /lubbock|texas tech/i.test(`${job.city} ${job.company}`),
  ).length;
  const upcomingDeadlines = matches
    .filter((job) => {
      const days = daysUntil(job.deadline);
      return days !== null && days >= 0 && days <= 14;
    })
    .sort((a, b) => dateValue(a.deadline) - dateValue(b.deadline));

  const showUpload = () => fileInputRef.current?.click();

  const runPrimaryAction = () => {
    if (!profile?.graduation_year) {
      setShowProfileWizard(true);
    } else if (!hasResume) {
      showUpload();
    } else if (matches.length === 0) {
      void loadMatches();
    } else {
      setActiveView("opportunities");
    }
  };

  const primaryActionLabel = !profile?.graduation_year
    ? "Complete your profile"
    : !hasResume
      ? "Upload your resume"
      : matches.length === 0
        ? "Find current matches"
        : "Review today's matches";

  const renderJobList = (jobs: JobCardJob[], featured = false) => (
    <div className="space-y-4">
      {jobs.map((job, index) => (
        <JobCard
          key={job.id}
          job={job}
          featured={featured && index === 0}
          trackingStatus={trackingStatuses[job.id] ?? null}
          isUpdating={updatingJobs.has(job.id)}
          previousInternship={Boolean(profile?.has_prev_intern)}
          projectDepth={profile?.project_depth ?? 0}
          onSave={handleSave}
          onApply={handleApply}
          onMarkApplied={handleMarkApplied}
        />
      ))}
    </div>
  );

  const renderLoadingCards = () => (
    <div className="space-y-4" role="status" aria-label="Loading opportunities">
      {[0, 1, 2].map((item) => (
        <Card key={item} className="rounded-2xl border-border/70">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Loading opportunities…</span>
    </div>
  );

  const renderEmptyMatches = (filtered = false) => (
    <Card className="rounded-2xl border-dashed bg-card/70">
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          {filtered ? <Filter className="h-5 w-5" /> : <BriefcaseBusiness className="h-5 w-5" />}
        </div>
        <h3 className="text-lg font-semibold">
          {filtered ? "No roles match those filters" : hasResume ? "No current matches yet" : "Start with your resume"}
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {filtered
            ? "Clear a filter or broaden your search to see more opportunities."
            : hasResume
              ? "Refresh recommendations as new internships are verified and added."
              : "Upload a PDF resume so RaiderMatch can surface relevant, current internships."}
        </p>
        <Button className="mt-5" variant={filtered ? "outline" : "default"} onClick={filtered ? clearFilters : runPrimaryAction}>
          {filtered ? "Clear filters" : hasResume ? "Refresh matches" : "Upload resume"}
        </Button>
      </CardContent>
    </Card>
  );

  const renderToday = () => (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-card" aria-labelledby="today-heading">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr,auto] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <span>Today</span>
              <span className="h-1 w-1 rounded-full bg-primary/50" />
              <span>{new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(new Date())}</span>
            </div>
            <h1 id="today-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {getGreeting()}, {firstName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {!hasResume
                ? "Add your resume to unlock relevant internships and clear match explanations."
                : matches.length === 0
                  ? "Your profile is ready. Let's find the strongest current opportunities for you."
                  : `${matches.length} current roles are ready to review. Start with the best fit and keep your tracker current.`}
            </p>
          </div>
          <Button size="lg" onClick={runPrimaryAction} disabled={isMatching || isUploading} className="h-11 shrink-0">
            {isMatching || isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {primaryActionLabel}
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Your progress">
        {[
          { label: "New roles", value: newMatches, detail: "posted in 48 hours" },
          { label: "Due soon", value: upcomingDeadlines.length, detail: "next 14 days" },
          { label: "Active", value: activeApplications, detail: "applications moving" },
          { label: "Local + TTU", value: localMatches, detail: "connected roles" },
        ].map((metric) => (
          <Card key={metric.label} className="rounded-xl border-border/70 shadow-none">
            <CardContent className="p-4 sm:p-5">
              <p className="text-2xl font-bold tabular-nums">{metric.value}</p>
              <p className="mt-1 text-sm font-medium">{metric.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <section className="min-w-0" aria-labelledby="best-matches-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">For you</p>
              <h2 id="best-matches-heading" className="text-xl font-bold tracking-tight">Best current matches</h2>
            </div>
            {matches.length > 5 && (
              <Button variant="ghost" size="sm" onClick={() => setActiveView("opportunities")}>
                See all <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isMatching && matches.length === 0
            ? renderLoadingCards()
            : matchError && matches.length === 0
              ? (
                  <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
                    <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                        <div>
                          <p className="font-semibold">Recommendations need another try</p>
                          <p className="mt-1 text-sm text-muted-foreground">{matchError}</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => void loadMatches()}>Try again</Button>
                    </CardContent>
                  </Card>
                )
              : matches.length > 0
                ? renderJobList(matches.slice(0, 5), true)
                : renderEmptyMatches()}
        </section>

        <aside className="space-y-4" aria-label="Next steps">
          <Card className="rounded-2xl border-border/70 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Search-ready profile</CardTitle>
                <span className="text-sm font-semibold tabular-nums text-primary">{profileCompletion}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`Profile ${profileCompletion}% complete`}>
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${profileCompletion}%` }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{hasResume ? "Resume on file" : "Resume needed"}</p>
                  <p className="text-xs text-muted-foreground">{hasResume ? `${profile?.skills?.length ?? 0} skills detected` : "PDF, up to 2 MB"}</p>
                </div>
                {hasResume && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Complete" />}
              </div>
              <div className="flex flex-wrap gap-2">
                {hasResume ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => void openResume()}><Eye className="h-4 w-4" /> View</Button>
                    <Button variant="outline" size="sm" onClick={showUpload}><Upload className="h-4 w-4" /> Replace</Button>
                  </>
                ) : (
                  <Button size="sm" onClick={showUpload}><Upload className="h-4 w-4" /> Upload resume</Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowProfileWizard(true)}>Edit profile</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-primary" />
                Next up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingDeadlines.slice(0, 2).map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setActiveView("opportunities")}
                  className="block w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <p className="mt-1 text-xs text-primary">{formatDeadline(job.deadline)}</p>
                </button>
              ))}
              {upcomingDeadlines.length === 0 && (
                <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">No deadlines in the next two weeks.</p>
              )}
              <button
                type="button"
                onClick={() => setActiveView("applications")}
                className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  <span className="block text-sm font-medium">Application follow-ups</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{followUps > 0 ? `${followUps} need attention` : `${trackerTotal} roles tracked`}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );

  const renderOpportunities = () => (
    <section aria-labelledby="opportunities-heading" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Current and verified</p>
          <h1 id="opportunities-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">Opportunities for you</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quality matches with clear eligibility and direct employer links.</p>
        </div>
        <Button variant="outline" onClick={() => void loadMatches()} disabled={!hasResume || isMatching}>
          <RefreshCw className={`h-4 w-4 ${isMatching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr),180px,150px,150px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search roles, companies, or skills"
                className="pl-9 pr-9"
                aria-label="Search opportunities"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger aria-label="Filter by location">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {availableCities.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fitFilter} onValueChange={(value) => setFitFilter(value as FitFilter)}>
              <SelectTrigger aria-label="Filter by match">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Match" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All matches</SelectItem>
                <SelectItem value="strong">Strong matches</SelectItem>
                <SelectItem value="eligible">Eligible roles</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger aria-label="Sort opportunities">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-semibold text-foreground">{filteredMatches.length}</span> {filteredMatches.length === 1 ? "opportunity" : "opportunities"}
        </p>
        {(searchQuery || cityFilter !== "all" || fitFilter !== "all" || sortOption !== "recommended") && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
        )}
      </div>

      {matchError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{matchError}</span>
        </div>
      )}

      {isMatching && matches.length === 0
        ? renderLoadingCards()
        : filteredMatches.length > 0
          ? renderJobList(filteredMatches)
          : renderEmptyMatches(matches.length > 0)}
    </section>
  );

  const renderProfile = () => (
    <section aria-labelledby="profile-heading" className="space-y-5">
      <div>
        <p className="text-sm font-medium text-primary">Your recommendation inputs</p>
        <h1 id="profile-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">Student profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Keeping these details current makes eligibility and match guidance more useful.</p>
      </div>

      {profileError && (
        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          {profileError}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),320px]">
        <Card className="rounded-2xl border-border/70 shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">About you</CardTitle>
            <Button size="sm" onClick={() => setShowProfileWizard(true)}><User className="h-4 w-4" /> Edit profile</Button>
          </CardHeader>
          <CardContent>
            {isProfileLoading ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {[0, 1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {[
                  { label: "Name", value: profile?.name },
                  { label: "Email", value: profile?.email },
                  { label: "Graduation", value: profile?.graduation_year ? `Class of ${profile.graduation_year}` : null },
                  { label: "Location", value: [profile?.location_city, profile?.location_state].filter(Boolean).join(", ") },
                  { label: "Work authorization", value: profile?.is_international ? "International student" : "U.S. work authorized" },
                  { label: "Prior internship", value: profile?.has_prev_intern ? "Yes" : "Not yet" },
                ].map((item) => (
                  <div key={item.label}>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</Label>
                    <p className="mt-1 text-sm font-medium">{item.value || "Not added"}</p>
                  </div>
                ))}
              </div>
            )}

            {profile?.skills && profile.skills.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Skills found in your resume</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit rounded-2xl border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </div>
              <p className="mt-3 text-sm font-medium">{hasResume ? "Replace your resume" : "Upload your resume"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Drag a PDF here or choose a file. Max 2 MB.</p>
              <Button className="mt-4" variant="outline" size="sm" onClick={showUpload} disabled={isUploading}>
                Choose PDF
              </Button>
            </div>
            {hasResume && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => void openResume()}><Eye className="h-4 w-4" /> View</Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => void handleDeleteResume()}>
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handleFileChange} className="hidden" />

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <button type="button" onClick={() => setActiveView("today")} className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img src="/raidermatch-logo.png" alt="" className="h-9 w-9 rounded-xl shadow-sm" />
            <span className="hidden text-lg font-bold tracking-tight sm:inline">RaiderMatch<span className="align-super text-[0.5em]">™</span></span>
          </button>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Student dashboard">
            {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                onClick={() => setActiveView(value)}
                className={activeView === value ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : "text-muted-foreground"}
                aria-current={activeView === value ? "page" : undefined}
              >
                <Icon className="h-4 w-4" /> {label}
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <div className="mr-2 hidden text-right lg:block">
              <p className="max-w-40 truncate text-sm font-medium">{profile?.name || "TTU Student"}</p>
              <p className="text-xs text-muted-foreground">{profile?.graduation_year ? `Class of ${profile.graduation_year}` : "Complete your profile"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Open settings"><Settings2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl overflow-x-auto px-3 pb-2 md:hidden" aria-label="Student dashboard">
          {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              onClick={() => setActiveView(value)}
              className={`shrink-0 ${activeView === value ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : "text-muted-foreground"}`}
              aria-current={activeView === value ? "page" : undefined}
            >
              <Icon className="h-4 w-4" /> {label}
            </Button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {activeView === "today" && renderToday()}
        {activeView === "opportunities" && renderOpportunities()}
        {activeView === "applications" && (
          <section aria-labelledby="tracker-heading" className="space-y-5">
            <div>
              <p className="text-sm font-medium text-primary">Your internship pipeline</p>
              <h1 id="tracker-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">Application tracker</h1>
              <p className="mt-1 text-sm text-muted-foreground">Keep stages, deadlines, notes, and next actions in one place.</p>
            </div>
            <Card className="rounded-2xl border-border/70 shadow-none">
              <CardContent className="p-4 sm:p-6"><ApplicationList /></CardContent>
            </Card>
          </section>
        )}
        {activeView === "profile" && renderProfile()}
      </main>

      <ProfileWizard
        isOpen={showProfileWizard}
        onClose={() => setShowProfileWizard(false)}
        userId={profile?.user_id || ""}
        onComplete={() => void loadProfile()}
      />
    </div>
  );
}
