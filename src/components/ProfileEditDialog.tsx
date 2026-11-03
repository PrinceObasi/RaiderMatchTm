import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchProjectDepth } from "@/lib/githubDepth";
import { MONTHS, normalizeGithub, normalizeUrl } from "@/lib/profile";
import { StudentUpdateSchema } from "@/lib/schemas";
import { isPhone } from "@/lib/validators";

type StudentProfile = Database["public"]["Tables"]["students"]["Row"];

export interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile | null;
  onSaved: () => void;
}

const NONE = "none";

interface FormState {
  degree: string;
  gradMonth: string;
  gradYear: string;
  city: string;
  state: string;
  authorization: "us" | "international";
  hasPrevIntern: boolean;
  gpa: string;
  github: string;
  linkedin: string;
  portfolio: string;
  phone: string;
  smsOptIn: boolean;
}

function formFromProfile(profile: StudentProfile | null): FormState {
  return {
    degree: profile?.degree ?? "",
    gradMonth: profile?.grad_month ? String(profile.grad_month) : NONE,
    gradYear: profile?.graduation_year ? String(profile.graduation_year) : NONE,
    city: profile?.location_city ?? "",
    state: profile?.location_state ?? "",
    authorization: profile?.is_international ? "international" : "us",
    hasPrevIntern: Boolean(profile?.has_prev_intern),
    gpa: profile?.gpa != null ? String(profile.gpa) : "",
    github: profile?.github ?? "",
    linkedin: profile?.linkedin_url ?? "",
    portfolio: profile?.portfolio_url ?? "",
    phone: profile?.phone ?? "",
    smsOptIn: Boolean(profile?.sms_opt_in),
  };
}

function blankToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

const FIELD_LABELS: Record<string, string> = {
  degree: "Major",
  graduation_year: "Graduation year",
  grad_month: "Graduation month",
  location_city: "City",
  location_state: "State",
  gpa: "GPA",
  github: "GitHub",
  linkedin_url: "LinkedIn",
  portfolio_url: "Portfolio",
  phone: "Phone",
};

export function ProfileEditDialog({ isOpen, onClose, profile, onSaved }: ProfileEditDialogProps) {
  const [form, setForm] = useState<FormState>(() => formFromProfile(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setForm(formFromProfile(profile));
      setErrors({});
    }
  }, [isOpen, profile]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years = new Set<number>();
    for (let year = current - 1; year <= Math.min(current + 6, 2035); year += 1) years.add(year);
    if (profile?.graduation_year) years.add(profile.graduation_year);
    return Array.from(years).sort((a, b) => a - b);
  }, [profile?.graduation_year]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!profile?.user_id) return;

    const github = normalizeGithub(form.github);
    const gpaText = form.gpa.trim();
    const gpa = gpaText ? Number(gpaText) : undefined;
    const candidate = {
      degree: blankToUndefined(form.degree),
      grad_month: form.gradMonth === NONE ? undefined : Number(form.gradMonth),
      graduation_year: form.gradYear === NONE ? undefined : Number(form.gradYear),
      location_city: blankToUndefined(form.city),
      location_state: blankToUndefined(form.state.toUpperCase()),
      gpa,
      has_prev_intern: form.hasPrevIntern,
      github: github || undefined,
      linkedin_url: normalizeUrl(form.linkedin) || undefined,
      portfolio_url: normalizeUrl(form.portfolio) || undefined,
      phone: blankToUndefined(form.phone),
      sms_opt_in: form.smsOptIn && Boolean(form.phone.trim()),
      is_international: form.authorization === "international",
    };

    const nextErrors: Record<string, string> = {};
    const parsed = StudentUpdateSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        nextErrors[field] ??= field === "gpa"
          ? "Enter a GPA between 0.00 and 4.00."
          : field === "github"
            ? "Enter just your GitHub username."
            : field === "linkedin_url" || field === "portfolio_url"
              ? "Enter a full link, like https://linkedin.com/in/your-name."
              : `Check your ${FIELD_LABELS[field]?.toLowerCase() ?? "entry"}.`;
      }
    }
    if (gpaText && !Number.isFinite(gpa)) nextErrors.gpa = "Enter a GPA between 0.00 and 4.00.";
    if (candidate.phone && !isPhone(candidate.phone)) nextErrors.phone = "Enter a 10-digit U.S. phone number.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const githubChanged = github.toLowerCase() !== (profile.github ?? "").toLowerCase();
      const projectDepth = !github ? 0 : githubChanged ? await fetchProjectDepth(github) : profile.project_depth ?? 0;

      const { error } = await supabase
        .from("students")
        .update({
          degree: candidate.degree ?? null,
          grad_month: candidate.grad_month ?? null,
          graduation_year: candidate.graduation_year ?? null,
          location_city: candidate.location_city ?? null,
          location_state: candidate.location_state ?? null,
          gpa: candidate.gpa ?? null,
          has_prev_intern: candidate.has_prev_intern,
          github: candidate.github ?? null,
          linkedin_url: candidate.linkedin_url ?? null,
          portfolio_url: candidate.portfolio_url ?? null,
          phone: candidate.phone ?? null,
          sms_opt_in: candidate.sms_opt_in,
          is_international: candidate.is_international,
          project_depth: projectDepth,
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      toast({
        title: "Profile saved",
        description: github && githubChanged
          ? `We checked your public GitHub repos. Project depth: ${Math.round(projectDepth * 100)}%.`
          : "Your matches will use these details next time they refresh.",
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Profile wasn't saved",
        description: "Something went wrong on our side. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fieldError = (field: string) => errors[field] ? (
    <p id={`${field}-error`} className="text-xs text-destructive">{errors[field]}</p>
  ) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            RaiderMatch uses these details to check eligibility and rank your matches.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6"
          onSubmit={(event) => { event.preventDefault(); void handleSave(); }}
          noValidate
        >
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">School</legend>
            <div className="space-y-2">
              <Label htmlFor="profile-degree">Major</Label>
              <Input
                id="profile-degree"
                placeholder="B.S. Computer Science"
                value={form.degree}
                onChange={(event) => update("degree", event.target.value)}
                aria-invalid={Boolean(errors.degree)}
              />
              {fieldError("degree")}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="profile-grad-month">Graduation month</Label>
                <Select value={form.gradMonth} onValueChange={(value) => update("gradMonth", value)}>
                  <SelectTrigger id="profile-grad-month"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not set</SelectItem>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-grad-year">Graduation year</Label>
                <Select value={form.gradYear} onValueChange={(value) => update("gradYear", value)}>
                  <SelectTrigger id="profile-grad-year"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not set</SelectItem>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError("graduation_year")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-gpa">GPA (optional)</Label>
                <Input
                  id="profile-gpa"
                  inputMode="decimal"
                  placeholder="3.50"
                  value={form.gpa}
                  onChange={(event) => update("gpa", event.target.value)}
                  aria-invalid={Boolean(errors.gpa)}
                  aria-describedby={errors.gpa ? "gpa-error" : undefined}
                />
                {fieldError("gpa")}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Location and eligibility</legend>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr),120px]">
              <div className="space-y-2">
                <Label htmlFor="profile-city">City</Label>
                <Input
                  id="profile-city"
                  placeholder="Lubbock"
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-state">State</Label>
                <Input
                  id="profile-state"
                  placeholder="TX"
                  value={form.state}
                  onChange={(event) => update("state", event.target.value)}
                  aria-invalid={Boolean(errors.location_state)}
                />
                {fieldError("location_state")}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-authorization">Work authorization</Label>
              <Select value={form.authorization} onValueChange={(value) => update("authorization", value as FormState["authorization"])}>
                <SelectTrigger id="profile-authorization"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">Authorized to work in the U.S.</SelectItem>
                  <SelectItem value="international">International student (may need sponsorship)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
              <Label htmlFor="profile-prev-intern" className="font-normal">I've completed an internship before</Label>
              <Switch
                id="profile-prev-intern"
                checked={form.hasPrevIntern}
                onCheckedChange={(checked) => update("hasPrevIntern", checked)}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Links</legend>
            <div className="space-y-2">
              <Label htmlFor="profile-github">GitHub username</Label>
              <Input
                id="profile-github"
                placeholder="your-username"
                value={form.github}
                onChange={(event) => update("github", event.target.value)}
                aria-invalid={Boolean(errors.github)}
              />
              {fieldError("github") ?? (
                <p className="text-xs text-muted-foreground">We look at your public repos to estimate project depth.</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-linkedin">LinkedIn</Label>
                <Input
                  id="profile-linkedin"
                  inputMode="url"
                  placeholder="linkedin.com/in/your-name"
                  value={form.linkedin}
                  onChange={(event) => update("linkedin", event.target.value)}
                  aria-invalid={Boolean(errors.linkedin_url)}
                />
                {fieldError("linkedin_url")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-portfolio">Portfolio</Label>
                <Input
                  id="profile-portfolio"
                  inputMode="url"
                  placeholder="yourname.dev"
                  value={form.portfolio}
                  onChange={(event) => update("portfolio", event.target.value)}
                  aria-invalid={Boolean(errors.portfolio_url)}
                />
                {fieldError("portfolio_url")}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Contact</legend>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone (optional)</Label>
              <Input
                id="profile-phone"
                type="tel"
                placeholder="(806) 555-0123"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
              {fieldError("phone")}
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="profile-sms"
                className="mt-0.5"
                checked={form.smsOptIn && Boolean(form.phone.trim())}
                disabled={!form.phone.trim()}
                onCheckedChange={(checked) => update("smsOptIn", checked === true)}
              />
              <Label htmlFor="profile-sms" className="text-sm font-normal leading-relaxed">
                Text me about application and interview updates. Msg &amp; data rates may apply.
              </Label>
            </div>
          </fieldset>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save profile"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
