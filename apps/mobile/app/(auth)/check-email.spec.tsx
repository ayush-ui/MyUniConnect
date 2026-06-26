import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import CheckEmailScreen from './check-email';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = { email: 'student@tu-ilmenau.de' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

const mockResend = jest.fn();
jest.mock('../../lib/api/auth', () => ({
  authApi: { resendVerification: (...a: unknown[]) => mockResend(...a) },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { email: 'student@tu-ilmenau.de' };
});

describe('CheckEmailScreen', () => {
  it('displays the email the link was sent to', () => {
    render(<CheckEmailScreen />);
    expect(screen.getByText('student@tu-ilmenau.de')).toBeTruthy();
  });

  it('resends the verification email and shows a confirmation', async () => {
    mockResend.mockResolvedValue({ message: 'ok' });
    render(<CheckEmailScreen />);
    fireEvent.press(screen.getByText("Didn't get it? Resend email"));

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith('student@tu-ilmenau.de');
      expect(screen.getByText('A new link has been sent — check your inbox.')).toBeTruthy();
    });
  });

  it('shows an error message when resend fails', async () => {
    mockResend.mockRejectedValue(new Error('network'));
    render(<CheckEmailScreen />);
    fireEvent.press(screen.getByText("Didn't get it? Resend email"));

    await waitFor(() => {
      expect(screen.getByText('Could not send email. Please try again.')).toBeTruthy();
    });
  });

  it('navigates back to login', () => {
    render(<CheckEmailScreen />);
    fireEvent.press(screen.getByText('Back to log in'));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('does not call resend when no email param is present', () => {
    mockParams = {};
    render(<CheckEmailScreen />);
    fireEvent.press(screen.getByText("Didn't get it? Resend email"));
    expect(mockResend).not.toHaveBeenCalled();
  });
});
