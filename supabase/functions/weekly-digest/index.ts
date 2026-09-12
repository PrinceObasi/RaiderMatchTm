Deno.serve((_req: Request) => {
  return new Response(
    JSON.stringify({
      error: "Gone",
      message: "Weekly digest is temporarily disabled while security hardening is completed.",
    }),
    {
      status: 410,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
});
