import { isServiceRoleRequest, serviceRoleHeaders } from "./service-role.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("accepts the exact service-role bearer", () => {
  const request = new Request("https://example.test", {
    headers: { Authorization: "Bearer service-secret" },
  });
  assert(
    isServiceRoleRequest(request, "service-secret"),
    "expected bearer authentication to pass",
  );
});

Deno.test("accepts the exact service-role apikey", () => {
  const request = new Request("https://example.test", {
    headers: { apikey: "service-secret" },
  });
  assert(
    isServiceRoleRequest(request, "service-secret"),
    "expected apikey authentication to pass",
  );
});

Deno.test("rejects missing, empty, and incorrect credentials", () => {
  assert(
    !isServiceRoleRequest(
      new Request("https://example.test"),
      "service-secret",
    ),
    "expected a missing credential to fail",
  );
  assert(
    !isServiceRoleRequest(
      new Request("https://example.test", {
        headers: serviceRoleHeaders("wrong-secret"),
      }),
      "service-secret",
    ),
    "expected an incorrect credential to fail",
  );
  assert(
    !isServiceRoleRequest(
      new Request("https://example.test", {
        headers: { Authorization: "Bearer anything" },
      }),
      "",
    ),
    "expected an empty configured key to fail closed",
  );
});
