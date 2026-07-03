export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES = {
  minLength: (value: string) => value.length >= PASSWORD_MIN_LENGTH,
  uppercase: (value: string) => /[A-Z]/.test(value),
  number: (value: string) => /\d/.test(value),
  special: (value: string) => /[^A-Za-z0-9]/.test(value),
};

export type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: PASSWORD_RULES.minLength(password),
    uppercase: PASSWORD_RULES.uppercase(password),
    number: PASSWORD_RULES.number(password),
    special: PASSWORD_RULES.special(password),
  };
}

export function isPasswordValid(password: string): boolean {
  return Object.values(getPasswordChecks(password)).every(Boolean);
}

export function getPasswordValidationMessage(password: string): string | null {
  const checks = getPasswordChecks(password);

  if (!checks.minLength) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!checks.uppercase) {
    return 'Password must include at least one uppercase letter';
  }
  if (!checks.number) {
    return 'Password must include at least one number';
  }
  if (!checks.special) {
    return 'Password must include at least one special character';
  }

  return null;
}
