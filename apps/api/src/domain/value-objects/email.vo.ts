import { ValidationError } from '../errors/app-error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(
    public readonly value: string,
    public readonly domain: string,
  ) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      throw new ValidationError('INVALID_EMAIL_FORMAT');
    }
    const domain = normalized.split('@')[1];
    return new Email(normalized, domain);
  }

  toString(): string {
    return this.value;
  }
}
