import { classifyPostingPage } from "./validation.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("classifies accessible posting pages as valid", () => {
  const result = classifyPostingPage(200, "<h1>Software Engineer Intern</h1>");
  assert(result.verdict === "valid", "expected an accessible page to pass");
});

Deno.test("classifies definitive closure responses as invalid", () => {
  for (const status of [404, 410]) {
    const result = classifyPostingPage(status, "");
    assert(result.verdict === "invalid", `expected HTTP ${status} to fail`);
  }

  const softClose = classifyPostingPage(
    200,
    "<p>This position has been filled.</p>",
  );
  assert(
    softClose.verdict === "invalid",
    "expected a definitive closed-position marker to fail",
  );
});

Deno.test("does not treat transient or blocked responses as dead links", () => {
  for (const status of [204, 400, 401, 403, 429, 500, 503]) {
    const result = classifyPostingPage(status, "");
    assert(
      result.verdict === "inconclusive",
      `expected HTTP ${status} to preserve active state`,
    );
  }
});
