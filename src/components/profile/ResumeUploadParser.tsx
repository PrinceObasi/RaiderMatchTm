import React, { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { TextContent } from "pdfjs-dist/types/src/display/api";
// @ts-ignore
import mammoth from "mammoth/mammoth.browser";

// Use CDN for pdf.js worker to avoid Vite build issues
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const SKILL_DICT = [
  "java","python","c","c++","c#","javascript","typescript","react","next.js","node",
  "express","postgres","mysql","mongodb","sql","graphql","docker","kubernetes","aws",
  "gcp","azure","git","html","css","tailwind","vite","supabase","firebase","django",
  "flask","pandas","numpy","matlab","go","rust","swift","kotlin"
];

function normalizeText(t: string) {
  return t.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function pdfToText(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const buf = await file.arrayBuffer();
      const pdf = await getDocument({ data: buf }).promise;
      let out = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = (await page.getTextContent()) as TextContent;
        const line = content.items
          .map((it: any) => ("str" in it ? it.str : ""))
          .join(" ");
        out += line + "\n";
      }
      resolve(normalizeText(out));
    } catch (e) {
      reject(e);
    }
  });
}

async function docxToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return normalizeText(value || "");
}

function extractProfileFromText(raw: string) {
  const text = raw.replace(/\s{2,}/g, " ").trim();
  const lower = text.toLowerCase();

  const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (text.match(/(\+?\d{1,2}[ -]?)?(\(?\d{3}\)?[ -.]?\d{3}[ -.]?\d{4})/) || [])[0];

  const linkedin = (text.match(/https?:\/\/(www\.)?linkedin\.com\/[^\s)]+/i) || [])[0];
  const github = (text.match(/https?:\/\/(www\.)?github\.com\/[^\s)]+/i) || [])[0];
  const urls = Array.from(new Set((text.match(/https?:\/\/[^\s)]+/gi) || [])));
  const portfolio = urls.find(u => u !== linkedin && u !== github && !u.includes("linkedin.com") && !u.includes("github.com"));

  const firstLine = (raw.split(/\n+/).map(s => s.trim()).filter(Boolean)[0] || "").replace(/[^A-Za-z .'-]/g, "");
  const name = firstLine && !firstLine.toLowerCase().startsWith("resume") && !firstLine.includes("@") ? firstLine : undefined;

  const loc = (text.match(/\b([A-Za-z.\- ]+),\s*([A-Za-z]{2})\b/) || [])[0];
  let location_city: string | undefined, location_state: string | undefined;
  if (loc) {
    const m = loc.match(/\b([A-Za-z.\- ]+),\s*([A-Za-z]{2})\b/);
    if (m) { location_city = m[1].trim(); location_state = m[2].trim().toUpperCase(); }
  }

  const uniMatch = (text.match(/\b(University|College|Institute|Texas Tech University|Texas Tech)\b.*?/i) || [])[0];
  const university = uniMatch?.includes("Texas Tech") ? "Texas Tech University" : uniMatch;

  const degreeMatch = (text.match(/\b(Bachelor|BS|B\.S\.|BEng|BE|Master|MS|M\.S\.|MBA)\b/i) || [])[0];
  const majorMatch = (text.match(/\b(Computer Science|Software Engineering|Computer Engineering|Data Science|Electrical Engineering|Information Systems)\b/i) || [])[0];

  const monthMatch = (text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i) || [])[0];
  const yearMatch = (text.match(/\b(20[2-4]\d|19\d{2})\b/) || [])[0];
  const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const grad_month = monthMatch ? MONTHS.indexOf(monthMatch.slice(0,3).toLowerCase()) + 1 : undefined;
  const graduation_year = yearMatch ? Number(yearMatch) : undefined;

  const skills = Array.from(
    new Set(SKILL_DICT.filter(s => lower.includes(s.toLowerCase())).map(s => s.toLowerCase()))
  );

  return {
    name,
    email,
    phone,
    location_city,
    location_state,
    university,
    degree: degreeMatch,
    major: majorMatch,
    grad_month,
    graduation_year,
    linkedin_url: linkedin,
    github: github,
    portfolio_url: portfolio,
    skills,
  };
}

interface ResumeUploadParserProps {
  onProfileUpdate?: () => void;
}

export default function ResumeUploadParser({ onProfileUpdate }: ResumeUploadParserProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onDrop = useCallback(async (accepted: File[]) => {
    setError(null);
    setMessage(null);
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setExtracting(true);
    try {
      const mime = f.type;
      const isPdf = mime === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      const isDocx = mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || f.name.toLowerCase().endsWith(".docx");
      const isDoc = mime === "application/msword" || f.name.toLowerCase().endsWith(".doc");

      if (isDoc) {
        throw new Error(".doc is not supported. Save as .docx and re-upload.");
      }
      let text = "";
      if (isPdf) text = await pdfToText(f);
      else if (isDocx) text = await docxToText(f);
      else throw new Error("Unsupported file type. Upload PDF or DOCX.");

      const candidate = extractProfileFromText(text);
      setProfile(candidate);
    } catch (e: any) {
      setError(e.message || "Failed to parse résumé.");
      setProfile(null);
    } finally {
      setExtracting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple: false,
    maxFiles: 1,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"]
    },
    maxSize: 15 * 1024 * 1024,
  });

  const rejectionMsg = useMemo(() => {
    if (!fileRejections.length) return null;
    const r = fileRejections[0];
    return r.errors.map(e => e.message).join("; ");
  }, [fileRejections]);

  async function saveToSupabase() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { data: { user }, error: uerr } = await supabase.auth.getUser();
      if (uerr || !user) throw new Error("Not authenticated.");

      const payload: any = {};
      if (profile.name) payload.name = profile.name;
      if (profile.email) payload.email = profile.email;
      if (profile.phone) payload.phone = profile.phone;
      if (profile.location_city) payload.location_city = profile.location_city;
      if (profile.location_state) payload.location_state = profile.location_state;
      if (profile.university) payload.university = profile.university;
      if (profile.degree) payload.degree = profile.degree;
      if (profile.major) payload.major = profile.major;
      if (profile.grad_month) payload.grad_month = profile.grad_month;
      if (profile.graduation_year) payload.graduation_year = profile.graduation_year;
      if (profile.linkedin_url) payload.linkedin_url = profile.linkedin_url;
      if (profile.github) payload.github = profile.github;
      if (profile.portfolio_url) payload.portfolio_url = profile.portfolio_url;
      if (profile.skills?.length) payload.skills = profile.skills;

      const { error: perr } = await supabase
        .from("students")
        .update(payload)
        .eq("user_id", user.id);

      if (perr) throw perr;
      setMessage("Profile updated from résumé!");
      onProfileUpdate?.();
    } catch (e: any) {
      setError(e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 cursor-pointer text-center transition
          ${isDragActive ? "border-primary bg-primary/5" : "border-border bg-background"}`}
      >
        <input {...getInputProps()} />
        <p className="text-lg font-medium">
          {isDragActive ? "Drop it here…" : "Drag & drop your résumé (PDF or DOCX), or click to select"}
        </p>
        <p className="text-sm text-muted-foreground mt-2">Max 15MB. `.doc` is not supported—save as .docx.</p>
        {file && (
          <p className="mt-3 text-sm">Selected: <span className="font-semibold">{file.name}</span></p>
        )}
      </div>

      {rejectionMsg && <p className="text-destructive text-sm">{rejectionMsg}</p>}
      {extracting && <p className="text-sm animate-pulse">Extracting text…</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {message && <p className="text-green-600 text-sm">{message}</p>}

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-xl p-4">
          {[
            ["name","Full name"],
            ["email","Email"],
            ["phone","Phone"],
            ["location_city","City"],
            ["location_state","State"],
            ["university","University"],
            ["degree","Degree"],
            ["major","Major"],
            ["grad_month","Grad month (1-12)"],
            ["graduation_year","Grad year"],
            ["linkedin_url","LinkedIn"],
            ["github","GitHub"],
            ["portfolio_url","Portfolio"],
          ].map(([key,label]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{label}</span>
              <input
                className="border rounded-lg p-2 bg-background"
                value={(profile as any)[key] ?? ""}
                onChange={e => setProfile((p: any) => ({ ...(p || {}), [key]: key.includes("grad_") || key.includes("month") ? Number(e.target.value || undefined) : e.target.value }))}
              />
            </label>
          ))}

          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Skills (comma-separated)</span>
            <input
              className="border rounded-lg p-2 bg-background"
              value={(profile.skills || []).join(", ")}
              onChange={e => setProfile((p: any) => ({ ...(p || {}), skills: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }))}
            />
          </label>

          <div className="md:col-span-2">
            <button
              onClick={saveToSupabase}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
            >
              {saving ? "Saving…" : "Confirm & Save to Profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
