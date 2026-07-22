import { isSafePublicUrl } from "./public-page.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("allows public HTTP job URLs", () => {
  assert(
    isSafePublicUrl("https://boards.greenhouse.io/example/jobs/123"),
    "expected a public HTTPS URL to pass",
  );
  assert(
    isSafePublicUrl("http://example.com/job"),
    "expected a public HTTP URL to pass",
  );
  assert(
    isSafePublicUrl("https://[2606:4700:4700::1111]/job"),
    "expected a public IPv6 URL to pass",
  );
});

Deno.test("rejects local, private, link-local, and non-HTTP URLs", () => {
  const blocked = [
    "file:///etc/passwd",
    "http://localhost/admin",
    "http://localhost./admin",
    "http://service.internal/admin",
    "http://service.internal./admin",
    "http://metadata.google.internal/",
    "http://metadata.google.internal./",
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://172.16.0.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:10.0.0.1]/",
    "http://[::ffff:169.254.169.254]/",
    "http://intranet/",
  ];
  for (const url of blocked) {
    assert(!isSafePublicUrl(url), `expected ${url} to be blocked`);
  }
});
