export interface PasswordValidationResult {
  isValid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  errors: string[];
  score: number;
}

export class PasswordValidator {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;
  private static readonly COMMON_PASSWORDS = [
    'password',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master',
    'hello',
    'football',
    'iloveyou',
    'princess',
    'sunshine',
    'ashley',
    'bailey',
    'passw0rd',
    'shadow',
    '1234567890',
    '111111',
    '123123',
  ];

  static validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    } else {
      score += 10;
      if (password.length >= 12) score += 5;
      if (password.length >= 16) score += 5;
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 10;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 10;
    }

    // Number check
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 10;
    }

    // Special character check
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    } else {
      score += 10;
    }

    // Common password check
    const lowerPassword = password.toLowerCase();
    if (this.COMMON_PASSWORDS.some((common) => lowerPassword.includes(common))) {
      errors.push('Password is too common and easily guessable');
      score -= 20;
    }

    // Sequential characters check
    if (this.hasSequentialChars(password)) {
      errors.push('Password contains sequential characters');
      score -= 10;
    }

    // Repeated characters check
    if (this.hasRepeatedChars(password)) {
      errors.push('Password contains repeated characters');
      score -= 10;
    }

    // Calculate strength
    let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    if (score >= 70) strength = 'strong';
    else if (score >= 50) strength = 'good';
    else if (score >= 30) strength = 'fair';

    // Ensure score is not negative
    score = Math.max(0, score);

    return {
      isValid: errors.length === 0,
      strength,
      errors,
      score,
    };
  }

  static validateAgainstOldPassword(newPassword: string, oldPasswordHash: string): boolean {
    // This is a basic check - in production, you'd use bcrypt.compare
    // This is to prevent users from reusing the same password
    return newPassword !== oldPasswordHash;
  }

  private static hasSequentialChars(password: string): boolean {
    const sequences = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const lowerPassword = password.toLowerCase();

    for (const seq of sequences) {
      for (let i = 0; i <= seq.length - 3; i++) {
        const substring = seq.substring(i, i + 3);
        if (lowerPassword.includes(substring)) {
          return true;
        }
      }
    }
    return false;
  }

  private static hasRepeatedChars(password: string): boolean {
    // Check for 3 or more repeated characters
    return /(.)\1{2,}/.test(password);
  }

  static getPasswordRequirements(): string[] {
    return [
      `At least ${this.MIN_LENGTH} characters long`,
      'At least one lowercase letter',
      'At least one uppercase letter',
      'At least one number',
      'At least one special character (@$!%*?&)',
      'Not a common password',
      'No sequential characters',
      'No repeated characters',
    ];
  }
}
