import { ConfigService } from '@nestjs/config';
import { ResendEmailService } from './resend-email.service';

const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => sendMock(...args) },
  })),
}));

function makeConfig(overrides: Record<string, string | undefined> = {}): ConfigService {
  const values: Record<string, string | undefined> = {
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'MyUniConnect <noreply@myuniconnect.app>',
    APP_URL: 'https://app.myuniconnect.test',
    ...overrides,
  };
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const v = values[key];
      if (v === undefined) throw new Error(`Missing config: ${key}`);
      return v;
    },
  } as unknown as ConfigService;
}

describe('ResendEmailService', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  it('sends a verification email with the correct from, recipient and subject', async () => {
    const service = new ResendEmailService(makeConfig());
    await service.sendVerificationEmail('student@tu-ilmenau.de', 'raw-token-123');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.from).toBe('MyUniConnect <noreply@myuniconnect.app>');
    expect(payload.to).toBe('student@tu-ilmenau.de');
    expect(payload.subject).toContain('Verify');
  });

  it('embeds the verification link built from APP_URL and the raw token', async () => {
    const service = new ResendEmailService(makeConfig());
    await service.sendVerificationEmail('student@tu-ilmenau.de', 'raw-token-123');

    const payload = sendMock.mock.calls[0][0];
    const expectedLink = 'https://app.myuniconnect.test/verify-email?token=raw-token-123';
    expect(payload.html).toContain(expectedLink);
    expect(payload.text).toContain(expectedLink);
  });

  it('falls back to localhost when APP_URL is not set', async () => {
    const service = new ResendEmailService(makeConfig({ APP_URL: undefined }));
    await service.sendVerificationEmail('student@tu-ilmenau.de', 'tok');

    const payload = sendMock.mock.calls[0][0];
    expect(payload.html).toContain('http://localhost:3000/verify-email?token=tok');
  });

  it('throws when Resend returns an error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });
    const service = new ResendEmailService(makeConfig());

    await expect(
      service.sendVerificationEmail('student@tu-ilmenau.de', 'tok'),
    ).rejects.toThrow('domain not verified');
  });

  it('throws on construction when RESEND_API_KEY is missing', () => {
    expect(() => new ResendEmailService(makeConfig({ RESEND_API_KEY: undefined }))).toThrow(
      'Missing config: RESEND_API_KEY',
    );
  });
});
