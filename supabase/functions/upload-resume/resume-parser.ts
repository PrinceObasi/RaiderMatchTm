import { extractText, getDocumentProxy } from "unpdf";

const MAX_RESUME_PAGES = 20;
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];

export type ResumeParseErrorCode =
  | "INVALID_PDF"
  | "NO_EXTRACTABLE_TEXT"
  | "TOO_MANY_PAGES";

export class ResumeParseError extends Error {
  constructor(
    message: string,
    readonly code: ResumeParseErrorCode,
  ) {
    super(message);
    this.name = "ResumeParseError";
  }
}

const skillAliases: ReadonlyArray<
  readonly [canonicalName: string, aliases: readonly string[]]
> = [
  ["JavaScript", ["javascript", "js"]],
  ["TypeScript", ["typescript", "ts"]],
  ["React", ["react", "react.js"]],
  ["Angular", ["angular"]],
  ["Vue", ["vue", "vue.js"]],
  ["Node.js", ["node.js", "nodejs", "node js"]],
  ["Express", ["express", "express.js"]],
  ["Python", ["python"]],
  ["Java", ["java"]],
  ["C++", ["c++"]],
  ["C#", ["c#"]],
  ["PHP", ["php"]],
  ["Ruby", ["ruby"]],
  ["Go", ["Go", "golang"]],
  ["Rust", ["rust"]],
  ["Swift", ["swift"]],
  ["HTML", ["html"]],
  ["CSS", ["css"]],
  ["SQL", ["sql"]],
  ["MongoDB", ["mongodb"]],
  ["PostgreSQL", ["postgresql", "postgres"]],
  ["MySQL", ["mysql"]],
  ["Redis", ["redis"]],
  ["AWS", ["aws", "amazon web services"]],
  ["Azure", ["azure"]],
  ["GCP", ["gcp", "google cloud platform"]],
  ["Docker", ["docker"]],
  ["Kubernetes", ["kubernetes", "k8s"]],
  ["Git", ["git"]],
  ["Linux", ["linux"]],
  ["Machine Learning", ["machine learning"]],
  ["AI", ["AI", "artificial intelligence"]],
  ["Data Science", ["data science"]],
  ["TensorFlow", ["tensorflow"]],
  ["PyTorch", ["pytorch"]],
  ["REST APIs", ["rest api", "rest apis", "restful api", "restful apis"]],
  ["GraphQL", ["graphql"]],
  ["Microservices", ["microservice", "microservices"]],
  ["CI/CD", ["ci/cd", "continuous integration", "continuous delivery"]],
  ["Agile", ["agile"]],
  ["Scrum", ["scrum"]],
  ["Figma", ["figma"]],
  ["Adobe Creative Suite", ["adobe creative suite"]],
  ["Photoshop", ["photoshop"]],
  ["Illustrator", ["illustrator"]],
  ["Network Security", ["network security"]],
  ["Cybersecurity", ["cybersecurity", "cyber security"]],
  ["Penetration Testing", ["penetration testing", "pen testing"]],
  ["SIEM", ["siem"]],
  ["Tableau", ["tableau"]],
  ["Power BI", ["power bi"]],
  ["R", ["R"]],
  ["Statistics", ["statistics"]],
  ["Analytics", ["analytics"]],
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsAlias(text: string, alias: string): boolean {
  const caseSensitive = alias === "AI" || alias === "Go" || alias === "R";
  const expression = new RegExp(
    `(?:^|[^a-z0-9])${escapeRegExp(alias)}(?=$|[^a-z0-9])`,
    caseSensitive ? "" : "i",
  );
  return expression.test(text);
}

export function parseResumeSkills(text: string): string[] {
  return skillAliases
    .filter(([, aliases]) =>
      aliases.some((alias) => containsAlias(text, alias))
    )
    .map(([canonicalName]) => canonicalName);
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const searchLimit = Math.min(bytes.length - PDF_SIGNATURE.length, 1024);

  for (let offset = 0; offset <= searchLimit; offset += 1) {
    if (PDF_SIGNATURE.every((byte, index) => bytes[offset + index] === byte)) {
      return true;
    }
  }

  return false;
}

function normalizeText(text: string): string {
  return text
    .replaceAll("\u0000", " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);

  if (!hasPdfSignature(bytes)) {
    throw new ResumeParseError(
      "The uploaded file is not a valid PDF.",
      "INVALID_PDF",
    );
  }

  const pdfDocument = await getDocumentProxy(bytes).catch(() => {
    throw new ResumeParseError(
      "We couldn't read this PDF. Export it as a new PDF and try again.",
      "INVALID_PDF",
    );
  });

  try {
    if (pdfDocument.numPages > MAX_RESUME_PAGES) {
      throw new ResumeParseError(
        `Resume PDFs must be ${MAX_RESUME_PAGES} pages or fewer.`,
        "TOO_MANY_PAGES",
      );
    }

    const { text } = await extractText(pdfDocument, { mergePages: true });
    const normalizedText = normalizeText(text);

    if (!normalizedText) {
      throw new ResumeParseError(
        "This PDF has no selectable text. Upload a text-based PDF instead.",
        "NO_EXTRACTABLE_TEXT",
      );
    }

    return normalizedText;
  } catch (error) {
    if (error instanceof ResumeParseError) throw error;

    throw new ResumeParseError(
      "We couldn't read this PDF. Export it as a new PDF and try again.",
      "INVALID_PDF",
    );
  } finally {
    try {
      await pdfDocument.destroy();
    } catch {
      // Parsing has already completed; cleanup errors should not fail the upload.
    }
  }
}
