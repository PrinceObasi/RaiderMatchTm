export function isTTUEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@ttu.edu');
}

export function isPhone(phone: string): boolean {
  if (!phone.trim()) return true; // Empty is valid (optional field)
  return /^(\+1)?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(phone.trim());
}

export interface PasswordValidation {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export function validatePassword(password: string): PasswordValidation {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const passedRequirements = Object.values(requirements).filter(Boolean).length;
  const isValid = Object.values(requirements).every(Boolean);

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (passedRequirements >= 5) strength = 'strong';
  else if (passedRequirements >= 3) strength = 'medium';

  return {
    isValid,
    strength,
    requirements
  };
}