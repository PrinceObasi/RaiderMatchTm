export function isTTUEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@ttu.edu');
}

export function isPhone(phone: string): boolean {
  if (!phone.trim()) return true; // Empty is valid (optional field)
  return /^(\+1)?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(phone.trim());
}