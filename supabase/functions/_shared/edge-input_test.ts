import {
  bearerToken,
  canonicalApplicationUrl,
  emailSubjectText,
  escapeHtml,
  isUuid,
  parseApplicationTriggerPayload,
} from "./edge-input.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("parses strict bearer tokens and UUIDs", () => {
  assert(bearerToken("Bearer token-value") === "token-value", "expected token");
  assert(
    bearerToken("Basic token-value") === null,
    "expected non-bearer rejection",
  );
  assert(isUuid("123e4567-e89b-42d3-a456-426614174000"), "expected UUID");
  assert(!isUuid("not-a-uuid"), "expected malformed UUID rejection");
});

Deno.test("normalizes canonical application input", () => {
  const url = canonicalApplicationUrl({
    direct_link: "ftp://example.com/job",
    application_link: "https://example.com/job",
  });
  assert(url === "https://example.com/job", "expected the first HTTP URL");

  const record = parseApplicationTriggerPayload({
    record: {
      id: "123e4567-e89b-42d3-a456-426614174000",
      internship_id: "223e4567-e89b-42d3-a456-426614174000",
      user_id: "323e4567-e89b-42d3-a456-426614174000",
    },
  });
  assert(
    record !== null && record.internship_id.startsWith("223e"),
    "expected trigger record",
  );
});

Deno.test("escapes email HTML and strips subject control characters", () => {
  assert(
    escapeHtml(`<script>alert("x")</script>`) ===
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    "expected escaped HTML",
  );
  assert(
    emailSubjectText("Hello\r\nBcc: attacker@example.com", "Fallback") ===
      "Hello Bcc: attacker@example.com",
    "expected a single-line subject",
  );
});
