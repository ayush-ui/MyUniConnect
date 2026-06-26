import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import RegisterScreen from './register';
import { ApiError } from '../../lib/api/client';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = { accountType: 'student', universityId: 'uni-1' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockRegister = jest.fn();
jest.mock('../../lib/api/auth', () => ({
  authApi: { register: (...a: unknown[]) => mockRegister(...a) },
}));

// "Create account" is both the header and the button label — press the button (last match).
function submit() {
  const matches = screen.getAllByText('Create account');
  fireEvent.press(matches[matches.length - 1]);
}

function fillValidForm(emailPlaceholder = 'student@tu-ilmenau.de') {
  fireEvent.changeText(screen.getByPlaceholderText('Max'), 'Max');
  fireEvent.changeText(screen.getByPlaceholderText('Muster'), 'Muster');
  fireEvent.changeText(screen.getByPlaceholderText(emailPlaceholder), 'student@tu-ilmenau.de');
  fireEvent.changeText(screen.getByPlaceholderText('Min 8 chars, uppercase, number, symbol'), 'Secret123!');
  fireEvent.changeText(screen.getByPlaceholderText('Repeat your password'), 'Secret123!');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { accountType: 'student', universityId: 'uni-1' };
});

describe('RegisterScreen', () => {
  it('shows validation errors for an empty form', () => {
    render(<RegisterScreen />);
    submit();
    expect(screen.getByText('First name is required')).toBeTruthy();
    expect(screen.getByText('Last name is required')).toBeTruthy();
    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects a weak password', () => {
    render(<RegisterScreen />);
    fillValidForm();
    fireEvent.changeText(screen.getByPlaceholderText('Min 8 chars, uppercase, number, symbol'), 'weak');
    fireEvent.changeText(screen.getByPlaceholderText('Repeat your password'), 'weak');
    submit();
    expect(
      screen.getByText('Min 8 chars, one uppercase, one number, one special character'),
    ).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('flags mismatched passwords', () => {
    render(<RegisterScreen />);
    fillValidForm();
    fireEvent.changeText(screen.getByPlaceholderText('Repeat your password'), 'Different123!');
    submit();
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('registers a partner student and routes to check-email with the "posting" variant', async () => {
    mockRegister.mockResolvedValue({ userId: 'u1', accountType: 'student', studentStatus: 'pending', message: 'ok' });
    render(<RegisterScreen />);
    fillValidForm();
    submit();

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'student@tu-ilmenau.de',
        password: 'Secret123!',
        firstName: 'Max',
        lastName: 'Muster',
        accountType: 'student',
        universityId: 'uni-1',
        claimedUniversityName: undefined,
      });
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(auth)/check-email',
        params: { email: 'student@tu-ilmenau.de', variant: 'posting' },
      });
    });
  });

  it('routes an "Other" student to the "review" variant', async () => {
    mockParams = { accountType: 'student', claimedUniversityName: 'Uni Stuttgart' };
    mockRegister.mockResolvedValue({ userId: 'u1', accountType: 'student', studentStatus: 'pending', message: 'ok' });
    render(<RegisterScreen />);
    fillValidForm();
    submit();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(auth)/check-email',
        params: { email: 'student@tu-ilmenau.de', variant: 'review' },
      });
    });
  });

  it('routes a non-student to the "browsing" variant', async () => {
    mockParams = { accountType: 'non_student' };
    mockRegister.mockResolvedValue({ userId: 'u1', accountType: 'non_student', studentStatus: 'none', message: 'ok' });
    render(<RegisterScreen />);
    fillValidForm('your@email.com');
    submit();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(auth)/check-email',
        params: { email: 'student@tu-ilmenau.de', variant: 'browsing' },
      });
    });
  });

  it('maps a 409 conflict to an inline email error', async () => {
    mockRegister.mockRejectedValue(new ApiError('EMAIL_ALREADY_REGISTERED', 'exists', 409));
    render(<RegisterScreen />);
    fillValidForm();
    submit();

    await waitFor(() => {
      expect(screen.getByText('This email is already registered')).toBeTruthy();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
