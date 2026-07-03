const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/,
};

export function validatePassword(password) {
  if (typeof password !== 'string' || !password) {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    };
  }

  if (!PASSWORD_REQUIREMENTS.uppercase.test(password)) {
    return { valid: false, message: 'Password must include at least one uppercase letter' };
  }

  if (!PASSWORD_REQUIREMENTS.number.test(password)) {
    return { valid: false, message: 'Password must include at least one number' };
  }

  if (!PASSWORD_REQUIREMENTS.special.test(password)) {
    return {
      valid: false,
      message: 'Password must include at least one special character',
    };
  }

  return { valid: true, message: 'Password is valid' };
}

export function getPasswordValidationChecks(password) {
  const value = password || '';
  return {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    uppercase: PASSWORD_REQUIREMENTS.uppercase.test(value),
    number: PASSWORD_REQUIREMENTS.number.test(value),
    special: PASSWORD_REQUIREMENTS.special.test(value),
  };
}
