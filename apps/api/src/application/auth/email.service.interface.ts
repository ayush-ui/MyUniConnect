export interface IEmailService {
  sendVerificationEmail(to: string, token: string): Promise<void>;
}

export const EMAIL_SERVICE = Symbol('IEmailService');
