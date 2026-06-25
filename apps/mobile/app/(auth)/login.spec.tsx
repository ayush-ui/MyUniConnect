import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from './login';
import { ApiError } from '../../lib/api/client';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockLogin = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

const mockResend = jest.fn();
jest.mock('../../lib/api/auth', () => ({
  authApi: { resendVerification: (...a: unknown[]) => mockResend(...a) },
}));

function fillCredentials() {
  fireEvent.changeText(screen.getByPlaceholderText('student@tu-ilmenau.de'), 'student@tu-ilmenau.de');
  fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'Secret123!');
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginScreen', () => {
  it('shows validation errors when submitting an empty form', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Log in'));
    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('rejects an invalid email format', () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('student@tu-ilmenau.de'), 'not-an-email');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'Secret123!');
    fireEvent.press(screen.getByText('Log in'));
    expect(screen.getByText('Enter a valid university email')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('logs in and navigates to the tabs on success', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginScreen />);
    fillCredentials();
    fireEvent.press(screen.getByText('Log in'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('student@tu-ilmenau.de', 'Secret123!');
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('shows the resend banner on EMAIL_NOT_VERIFIED', async () => {
    mockLogin.mockRejectedValue(new ApiError('EMAIL_NOT_VERIFIED', 'not verified', 401));
    render(<LoginScreen />);
    fillCredentials();
    fireEvent.press(screen.getByText('Log in'));

    await waitFor(() => {
      expect(screen.getByText("Your email address hasn't been verified yet.")).toBeTruthy();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('triggers resend from the banner', async () => {
    mockLogin.mockRejectedValue(new ApiError('EMAIL_NOT_VERIFIED', 'not verified', 401));
    mockResend.mockResolvedValue({ message: 'ok' });
    render(<LoginScreen />);
    fillCredentials();
    fireEvent.press(screen.getByText('Log in'));

    const resendLink = await screen.findByText('Resend verification email');
    fireEvent.press(resendLink);

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith('student@tu-ilmenau.de');
      expect(screen.getByText('Verification email sent — check your inbox.')).toBeTruthy();
    });
  });

  it('shows a generic message on invalid credentials', async () => {
    mockLogin.mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 'bad', 401));
    render(<LoginScreen />);
    fillCredentials();
    fireEvent.press(screen.getByText('Log in'));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeTruthy();
    });
  });
});
