export const RESUME_MAX_BYTES = 2 * 1024 * 1024;

type ResumeUpload = Pick<File, "size" | "type">;

export function validateResumeUpload(file: ResumeUpload): string | null {
  if (file.type !== "application/pdf") {
    return "Only PDF files are allowed";
  }

  if (file.size > RESUME_MAX_BYTES) {
    return "File size must be 2 MB or less";
  }

  return null;
}
