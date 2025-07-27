export function isTTUEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@ttu.edu');
}