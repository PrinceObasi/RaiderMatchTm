import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  encodeExternalApplicationNote,
  parseExternalApplicationNote,
  type ExternalApplicationEnvelope,
} from "@/lib/externalApplication";
import { FastAddModal } from "./FastAddModal";
import { firstValidHttpUrl } from "@/lib/httpUrl";

// ─── Status config ───────────────────────────────────────────────────────────

const STATUSES = [
  { key: "saved",        label: "Saved",        color: "#6B7280", icon: "○" },
  { key: "applied",      label: "Applied",      color: "#2563EB", icon: "✓" },
  { key: "assessment",   label: "Assessment",   color: "#D97706", icon: "◈" },
  { key: "interview",    label: "Interview",    color: "#7C3AED", icon: "◆" },
  { key: "offer",        label: "Offer",        color: "#059669", icon: "★" },
  { key: "rejected",     label: "Rejected",     color: "#DC2626", icon: "✗" },
  { key: "withdrawn",    label: "Withdrawn",    color: "#9CA3AF", icon: "×" },
  { key: "no_response",  label: "No Response",  color: "#9CA3AF", icon: "–" },
] as const;

type StatusKey = typeof STATUSES[number]["key"];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s])) as Record<string, typeof STATUSES[number]>;

function normalizeStatus(value: string | null): StatusKey {
  return value && Object.prototype.hasOwnProperty.call(STATUS_MAP, value)
    ? value as StatusKey
    : "applied";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppData {
  application_id: string;
  status: StatusKey;
  applied_at: string;
  note: string | null;
  company: string;
  role_title: string;
  location: string;
  work_mode: string | null;
  tech_stack: string[];
  application_link: string | null;
  deadline: string | null;
  days_in_status: number;
  externalApplication: ExternalApplicationEnvelope | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status];
  if (!s) return null;
  return (
    <span style={{
      background: s.color + "18", color: s.color,
      fontSize: 11, fontWeight: 600, padding: "2px 8px",
      borderRadius: 99, letterSpacing: "0.02em", whiteSpace: "nowrap" as const,
    }}>
      {s.icon} {s.label}
    </span>
  );
}

function DeadlinePill({ deadline }: { deadline: string | null }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  const past = days < 0;
  const urgent = days <= 7;
  const color = past ? "#DC2626" : urgent ? "#D97706" : "#6B7280";
  return (
    <span style={{ fontSize: 11, color, fontWeight: 500 }}>
      {past ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
    </span>
  );
}

function StaleBadge({ days }: { days: number }) {
  if (days < 14) return null;
  const color = days >= 30 ? "#DC2626" : "#D97706";
  return (
    <span style={{ fontSize: 10, color, fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {days}d no update
    </span>
  );
}

function TechPills({ stack }: { stack: string[] }) {
  if (!stack || stack.length === 0) return null;
  const show = stack.slice(0, 3);
  const extra = stack.length - 3;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
      {show.map((t) => (
        <span key={t} style={{
          fontSize: 10, padding: "1px 6px", borderRadius: 4,
          background: "#F3F4F6", color: "#6B7280", fontFamily: "monospace", letterSpacing: "-0.01em",
        }}>
          {t}
        </span>
      ))}
      {extra > 0 && <span style={{ fontSize: 10, color: "#9CA3AF" }}>+{extra}</span>}
    </div>
  );
}

function StatBar({ apps }: { apps: AppData[] }) {
  const counts: Record<string, number> = {};
  STATUSES.forEach((s) => { counts[s.key] = 0; });
  apps.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
  const active = (counts.saved || 0) + (counts.applied || 0) + (counts.assessment || 0) + (counts.interview || 0);

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 20 }}>
      <StatTile value={apps.length} label="Total" color="#374151" />
      {STATUSES.filter((s) => counts[s.key] > 0).map((s) => (
        <StatTile key={s.key} value={counts[s.key]} label={s.label} color={s.color} />
      ))}
      {active > 0 && (
        <StatTile value={active} label="Active" color="#CC0000" highlight />
      )}
    </div>
  );
}

function StatTile({ value, label, color, highlight = false }: { value: number; label: string; color: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? "#CC000010" : "#F9FAFB",
      border: highlight ? "1px solid #CC000020" : "1px solid #F3F4F6",
      borderRadius: 8, padding: "8px 14px",
      display: "flex", flexDirection: "column" as const, alignItems: "center", minWidth: 56,
    }}>
      <span style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "#9CA3AF" }}>
      <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>○</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>No applications yet</div>
      <div style={{ fontSize: 14, maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
        Save or apply to internships from the explore page and they'll show up here.
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ExternalBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "1px 6px",
      borderRadius: 99, background: "#F3F4F6", color: "#6B7280",
      border: "1px solid #E5E7EB", whiteSpace: "nowrap" as const,
      letterSpacing: "0.02em",
    }}>
      External
    </span>
  );
}

function AppCard({
  app, onStatusChange, onNoteUpdate, expanded, onToggleExpand,
}: {
  app: AppData;
  onStatusChange: (id: string, status: StatusKey) => void;
  onNoteUpdate: (id: string, note: string) => void;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const s = STATUS_MAP[app.status] || STATUS_MAP.applied;
  const [editing, setEditing] = useState(false);
  const [noteVal, setNoteVal] = useState(app.note || "");
  const finished = ["offer", "rejected", "withdrawn", "no_response"].includes(app.status);

  return (
    <div
      onClick={() => onToggleExpand(app.application_id)}
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderLeft: `3px solid ${s.color}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "box-shadow 0.15s",
        opacity: finished ? 0.72 : 1,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {app.company}
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {app.role_title}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          {app.externalApplication && <ExternalBadge />}
          <StatusBadge status={app.status} />
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" as const }}>
        {app.location && <span style={{ fontSize: 11, color: "#9CA3AF" }}>📍 {app.location}</span>}
        {app.work_mode && <span style={{ fontSize: 11, color: "#9CA3AF" }}>· {app.work_mode}</span>}
      </div>

      {/* Tech */}
      <div style={{ marginTop: 8 }}>
        <TechPills stack={app.tech_stack} />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>Applied {formatDate(app.applied_at)}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <DeadlinePill deadline={app.deadline} />
          <StaleBadge days={app.days_in_status} />
        </div>
      </div>

      {/* Note preview */}
      {app.note && !expanded && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📝 {app.note}
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F3F4F6" }}>
          {/* Status buttons */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              Update status
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
              {STATUSES.filter((st) => st.key !== app.status).map((st) => (
                <button
                  key={st.key}
                  onClick={() => onStatusChange(app.application_id, st.key)}
                  style={{
                    fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 6,
                    border: `1px solid ${st.color}30`, background: st.color + "10",
                    color: st.color, cursor: "pointer", fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = st.color + "20"; }}
                  onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = st.color + "10"; }}
                >
                  {st.icon} {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              Notes
            </div>
            {editing ? (
              <div style={{ display: "flex", gap: 6 }}>
                <textarea
                  value={noteVal}
                  onChange={(e) => setNoteVal(e.target.value)}
                  placeholder="Add a note — recruiter name, interview date, follow-up reminder..."
                  rows={2}
                  style={{
                    flex: 1, fontSize: 13, padding: "8px 10px", borderRadius: 6,
                    border: "1px solid #D1D5DB", background: "#F9FAFB",
                    color: "#111827", fontFamily: "inherit", resize: "vertical" as const, outline: "none",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                  <button
                    onClick={() => { onNoteUpdate(app.application_id, noteVal); setEditing(false); }}
                    style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "none", background: "#CC0000", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setNoteVal(app.note || ""); setEditing(false); }}
                    style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E7EB", background: "transparent", color: "#6B7280", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditing(true)}
                style={{
                  fontSize: 13, padding: "8px 10px", borderRadius: 6,
                  border: "1px dashed #E5E7EB",
                  color: app.note ? "#111827" : "#9CA3AF",
                  cursor: "text", minHeight: 36, lineHeight: 1.5,
                }}
              >
                {app.note || "Click to add a note..."}
              </div>
            )}
          </div>

          {app.application_link && (
            <a
              href={app.application_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "#CC0000", fontWeight: 500, textDecoration: "none" }}
            >
              View original listing →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Board card (compact) ─────────────────────────────────────────────────────

function BoardCard({ app, onStatusChange, expanded, onToggleExpand }: {
  app: AppData;
  onStatusChange: (id: string, status: StatusKey) => void;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onToggleExpand(app.application_id)}
      style={{
        background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8,
        padding: 10, cursor: "pointer", transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4, marginBottom: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{app.company}</div>
        {app.externalApplication && <ExternalBadge />}
      </div>
      <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {app.role_title}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{formatDate(app.applied_at)}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <DeadlinePill deadline={app.deadline} />
          <StaleBadge days={app.days_in_status} />
        </div>
      </div>
      {app.note && (
        <div style={{ marginTop: 6, fontSize: 10, color: "#9CA3AF", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📝 {app.note}
        </div>
      )}
      {expanded && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F3F4F6" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
            Move to
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
            {STATUSES.filter((st) => st.key !== app.status).map((st) => (
              <button
                key={st.key}
                onClick={() => onStatusChange(app.application_id, st.key)}
                style={{
                  fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 4,
                  border: "none", background: st.color + "15", color: st.color,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {st.icon} {st.label}
              </button>
            ))}
          </div>
          {app.location && (
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6 }}>
              📍 {app.location}{app.work_mode ? ` · ${app.work_mode}` : ""}
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <TechPills stack={app.tech_stack} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const BOARD_COLUMNS = [
  { key: "saved",       label: "Saved",       statuses: ["saved"] },
  { key: "applied",     label: "Applied",     statuses: ["applied"] },
  { key: "assessment",  label: "Assessment",  statuses: ["assessment"] },
  { key: "interview",   label: "Interview",   statuses: ["interview"] },
  { key: "decided",     label: "Decided",     statuses: ["offer", "rejected", "withdrawn", "no_response"] },
] as const;

export function ApplicationList() {
  const [apps, setApps] = useState<AppData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        internship_id,
        applied_at,
        status,
        status_changed_at,
        last_updated_at,
        note,
        internships!internship_id (
          role_title,
          company,
          location,
          deadline,
          tech_stack,
          application_link,
          direct_link,
          apply_url,
          work_mode,
          employment_type
        )
      `)
      .order("applied_at", { ascending: false });

    if (error) {
      console.error("Error loading applications:", error);
      setLoadError("We couldn't load your applications. Please try again.");
    } else {
      const mapped: AppData[] = (data ?? []).map((row) => {
        const internship = row.internships;
        const externalApplication = (!row.internship_id || !internship)
          ? parseExternalApplicationNote(row.note)
          : null;
        return {
          application_id: row.id,
          status: normalizeStatus(row.status),
          applied_at: row.applied_at || new Date().toISOString(),
          note: externalApplication ? externalApplication.note : row.note,
          company: internship?.company || externalApplication?.company || "Unknown",
          role_title: internship?.role_title || externalApplication?.roleTitle || "Internship",
          location: internship?.location || externalApplication?.location || "",
          work_mode: internship?.work_mode || internship?.employment_type || null,
          tech_stack: internship?.tech_stack || [],
          application_link: firstValidHttpUrl(
            internship?.direct_link,
            internship?.application_link,
            internship?.apply_url,
            externalApplication?.url,
          ),
          deadline: internship?.deadline || externalApplication?.deadline || null,
          days_in_status: daysSince(row.status_changed_at || row.last_updated_at || row.applied_at),
          externalApplication,
        };
      });
      setApps(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusChange = useCallback(async (appId: string, newStatus: StatusKey) => {
    const previous = apps.find((app) => app.application_id === appId);
    if (!previous || previous.status === newStatus) return;

    setApps((prev) =>
      prev.map((a) => a.application_id === appId
        ? { ...a, status: newStatus, days_in_status: 0 }
        : a
      )
    );
    const { data, error } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", appId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Error updating application status:", error);
      setApps((current) => current.map((app) =>
        app.application_id === appId && app.status === newStatus
          ? { ...app, status: previous.status, days_in_status: previous.days_in_status }
          : app
      ));
      showToast("Status update failed. Please try again.");
      return;
    }

    showToast(`Status updated to ${STATUS_MAP[newStatus]?.label || newStatus}`);
  }, [apps, showToast]);

  const handleNoteUpdate = useCallback(async (appId: string, note: string) => {
    const previous = apps.find((app) => app.application_id === appId);
    if (!previous) return;
    const nextNote = note.trim() || null;
    const nextExternalApplication = previous.externalApplication
      ? { ...previous.externalApplication, note: nextNote }
      : null;
    const persistedNote = nextExternalApplication
      ? encodeExternalApplicationNote(nextExternalApplication)
      : nextNote;

    setApps((prev) =>
      prev.map((a) => a.application_id === appId
        ? { ...a, note: nextNote, externalApplication: nextExternalApplication }
        : a)
    );

    const { data, error } = await supabase
      .from("applications")
      .update({ note: persistedNote })
      .eq("id", appId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Error updating application note:", error);
      setApps((current) => current.map((app) =>
        app.application_id === appId && app.note === nextNote
          ? { ...app, note: previous.note, externalApplication: previous.externalApplication }
          : app
      ));
      showToast("Note update failed. Please try again.");
      return;
    }

    showToast("Note saved");
  }, [apps, showToast]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const appsWithNotes = apps;

  const filtered = filter === "all" ? appsWithNotes : appsWithNotes.filter((a) => a.status === filter);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading applications...</div>;
  }

  return (
    <div style={{ fontFamily: "inherit", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" as const, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.2 }}>
            Application tracker
          </h2>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "4px 0 0" }}>
            Track every application from saved to offer
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <FastAddModal onSuccess={fetchApplications} />
          {/* View toggle */}
          <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 8, padding: 2 }}>
          {(["list", "board"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 6, border: "none",
                background: view === v ? "#fff" : "transparent",
                color: view === v ? "#111827" : "#9CA3AF",
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s", textTransform: "capitalize" as const,
              }}
            >
              {v}
            </button>
          ))}
          </div>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            padding: "12px 14px", marginBottom: 16, borderRadius: 8,
            border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontSize: 13,
          }}
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void fetchApplications()}
            style={{
              border: "1px solid #FCA5A5", borderRadius: 6, background: "#fff",
              color: "#991B1B", padding: "5px 10px", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {(apps.length > 0 || !loadError) && <StatBar apps={appsWithNotes} />}

      {apps.length === 0 ? (
        loadError ? null : <EmptyState />
      ) : view === "list" ? (
        <>
          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" as const }}>
            <FilterPill label={`All (${apps.length})`} active={filter === "all"} onClick={() => setFilter("all")} color="#CC0000" />
            {STATUSES.filter((s) => appsWithNotes.some((a) => a.status === s.key)).map((s) => {
              const count = appsWithNotes.filter((a) => a.status === s.key).length;
              return (
                <FilterPill key={s.key} label={`${s.label} (${count})`} active={filter === s.key} onClick={() => setFilter(s.key)} color={s.color} />
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {filtered.map((app) => (
              <AppCard
                key={app.application_id}
                app={app}
                onStatusChange={handleStatusChange}
                onNoteUpdate={handleNoteUpdate}
                expanded={expandedId === app.application_id}
                onToggleExpand={toggleExpand}
              />
            ))}
          </div>
        </>
      ) : (
        /* Board view */
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${BOARD_COLUMNS.length}, 1fr)`, gap: 10, overflowX: "auto" }}>
          {BOARD_COLUMNS.map((col) => {
            const colApps = appsWithNotes.filter((a) => (col.statuses as readonly string[]).includes(a.status));
            const colColor = STATUS_MAP[col.statuses[0]]?.color || "#6B7280";
            return (
              <div key={col.key} style={{ minWidth: 180 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                  padding: "6px 10px", borderRadius: 8, background: colColor + "10",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colColor }}>{col.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: colColor, opacity: 0.6 }}>{colApps.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {colApps.map((app) => (
                    <BoardCard
                      key={app.application_id}
                      app={app}
                      onStatusChange={handleStatusChange}
                      expanded={expandedId === app.application_id}
                      onToggleExpand={toggleExpand}
                    />
                  ))}
                  {colApps.length === 0 && (
                    <div style={{
                      textAlign: "center", padding: "20px 8px", color: "#9CA3AF",
                      fontSize: 11, border: "1px dashed #E5E7EB", borderRadius: 8,
                    }}>
                      No applications
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1F2937", color: "#fff", padding: "10px 20px", borderRadius: 10,
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 999,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 99,
        border: active ? `1px solid ${color}` : "1px solid #E5E7EB",
        background: active ? color + "15" : "transparent",
        color: active ? color : "#6B7280",
        cursor: "pointer", fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
