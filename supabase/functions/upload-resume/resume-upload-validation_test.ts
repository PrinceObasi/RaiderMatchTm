import {
  RESUME_MAX_BYTES,
  validateResumeUpload,
} from "./resume-upload-validation.ts";

function assertEquals<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test("accepts a PDF at the upload limit", () => {
  assertEquals(
    validateResumeUpload({ size: RESUME_MAX_BYTES, type: "application/pdf" }),
    null,
  );
});

Deno.test("rejects non-PDF uploads", () => {
  assertEquals(
    validateResumeUpload({ size: 128, type: "image/png" }),
    "Only PDF files are allowed",
  );
});

Deno.test("rejects PDFs larger than 2 MB", () => {
  assertEquals(
    validateResumeUpload({
      size: RESUME_MAX_BYTES + 1,
      type: "application/pdf",
    }),
    "File size must be 2 MB or less",
  );
});
