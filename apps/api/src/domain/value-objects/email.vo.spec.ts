import { Email } from './email.vo';
import { ValidationError } from '../errors/app-error';

describe('Email value object', () => {
  it('creates a valid email and normalises to lowercase', () => {
    const email = Email.create('Student@TU-Ilmenau.DE');
    expect(email.value).toBe('student@tu-ilmenau.de');
    expect(email.domain).toBe('tu-ilmenau.de');
  });

  it('throws ValidationError for malformed email', () => {
    expect(() => Email.create('not-an-email')).toThrow(ValidationError);
    expect(() => Email.create('@nodomain')).toThrow(ValidationError);
    expect(() => Email.create('noatsign.com')).toThrow(ValidationError);
  });

  it('trims surrounding whitespace', () => {
    const email = Email.create('  user@tu-ilmenau.de  ');
    expect(email.value).toBe('user@tu-ilmenau.de');
  });
});
