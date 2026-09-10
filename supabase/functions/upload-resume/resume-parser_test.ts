import {
  extractTextFromPDF,
  parseResumeSkills,
  ResumeParseError,
} from "./resume-parser.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${
        JSON.stringify(actual)
      }`,
    );
  }
}

async function assertParseError(
  operation: () => Promise<unknown>,
  expectedCode: ResumeParseError["code"],
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    assert(error instanceof ResumeParseError, "expected a ResumeParseError");
    assertEquals(error.code, expectedCode, "unexpected parse error code");
    return;
  }

  throw new Error("expected parsing to fail");
}

function buildPdf(text: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const escapedText = text.replace(/[\\()]/g, "\\$&");
  const stream = `BT\n/F1 12 Tf\n72 720 Td\n(${escapedText}) Tj\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${
      encoder.encode(stream).length
    } >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(pdf).buffer;
}

Deno.test("extracts skills from the uploaded PDF instead of placeholder text", async () => {
  const buffer = buildPdf(
    "Taylor Smith built services with TypeScript React PostgreSQL and Docker",
  );

  const text = await extractTextFromPDF(buffer);
  const skills = parseResumeSkills(text);

  assert(text.includes("Taylor Smith"), "expected text from the generated PDF");
  assertEquals(
    skills,
    ["TypeScript", "React", "PostgreSQL", "Docker"],
    "expected only skills present in the uploaded PDF",
  );
  assert(
    !skills.includes("Python"),
    "must not return the old placeholder skills",
  );
});

Deno.test("rejects a file that only claims to be a PDF", async () => {
  const buffer = new TextEncoder().encode("not really a PDF").buffer;
  await assertParseError(() => extractTextFromPDF(buffer), "INVALID_PDF");
});

Deno.test("rejects PDFs without selectable text", async () => {
  await assertParseError(
    () => extractTextFromPDF(buildPdf("")),
    "NO_EXTRACTABLE_TEXT",
  );
});

Deno.test("does not infer short skills from substrings", () => {
  assertEquals(
    parseResumeSkills("Email marketing for an ongoing digital program"),
    [],
    "AI, Go, Git, and R should require standalone skill names",
  );
});
