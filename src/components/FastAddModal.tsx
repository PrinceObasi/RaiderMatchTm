// Fast-add external applications — the "log it before I forget" flow.

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { encodeExternalApplicationNote } from "@/lib/externalApplication";
import { normalizeHttpUrl } from "@/lib/httpUrl";

const STATUS_OPTIONS = [
  { value: "applied",    label: "Applied" },
  { value: "saved",      label: "Saved (not applied yet)" },
  { value: "assessment", label: "Assessment / OA" },
  { value: "interview",  label: "Interview" },
  { value: "offer",      label: "Offer" },
];

interface FastAddModalProps {
  onSuccess: () => void;
}

export function FastAddModal({ onSuccess }: FastAddModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [url, setUrl] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("applied");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");

  const reset = () => {
    setCompany(""); setRoleTitle(""); setUrl("");
    setLocation(""); setStatus("applied"); setDeadline(""); setNote("");
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!company.trim() || !roleTitle.trim()) {
      toast({ title: "Company and role title are required", variant: "destructive" });
      return;
    }

    const normalizedUrl = normalizeHttpUrl(url);
    if (url.trim() && !normalizedUrl) {
      toast({
        title: "Enter a valid job posting URL",
        description: "Use an http:// or https:// link.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setLoading(false);
      toast({
        title: "Failed to add application",
        description: "Your session has expired. Please sign in and try again.",
        variant: "destructive",
      });
      return;
    }

    const externalNote = encodeExternalApplicationNote({
      company: company.trim(),
      roleTitle: roleTitle.trim(),
      url: normalizedUrl,
      location: location.trim() || null,
      deadline: deadline || null,
      note: note.trim() || null,
    });
    const { error } = await supabase.from("applications").insert({
      user_id: user.id,
      internship_id: null,
      status,
      applied_at: new Date().toISOString(),
      note: externalNote,
    });
    setLoading(false);

    if (error) {
      toast({
        title: "Failed to add application",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({ title: `${company} added to your tracker` });
    onSuccess();
    reset();
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#CC0000] hover:bg-[#A30000] text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Add application
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-md"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Log an application</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Applied somewhere outside RaiderMatch? Track it here so nothing slips.
          </p>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fa-company">Company *</Label>
              <Input
                id="fa-company"
                placeholder="e.g. Stripe"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-role">Role *</Label>
              <Input
                id="fa-role"
                placeholder="e.g. SWE Intern"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fa-url">Job posting URL</Label>
            <Input
              id="fa-url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-deadline">Deadline</Label>
              <Input
                id="fa-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fa-location">Location</Label>
            <Input
              id="fa-location"
              placeholder="e.g. Austin, TX or Remote"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fa-note">Note</Label>
            <Textarea
              id="fa-note"
              placeholder="Referral from…, recruiter name, follow-up date…"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#CC0000] hover:bg-[#A30000] text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Add to tracker
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Tip: ⌘+Enter to submit fast
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
