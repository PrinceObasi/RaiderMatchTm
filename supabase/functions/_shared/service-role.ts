export function isServiceRoleRequest(
  req: Request,
  serviceRoleKey: string,
): boolean {
  if (!serviceRoleKey) return false;

  const authorization = req.headers.get("authorization");
  const apiKey = req.headers.get("apikey");

  return authorization === `Bearer ${serviceRoleKey}` ||
    apiKey === serviceRoleKey;
}

export function serviceRoleHeaders(
  serviceRoleKey: string,
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  };
}
