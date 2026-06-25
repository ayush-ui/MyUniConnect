import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import RegisterScreen from './register';
import { ApiError } from '../../lib/api/client';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
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

function fillValidForm() {
  fireEvent.changeText(screen.getByPlaceholderText('Max'), 'Max');
  fireEvent.changeText(screen.getByPlaceholderText('Muster'), 'Muster');
  fireEvent.changeText(screen.getByPlaceholderText('student@tu-ilmenau.de'), 'student@tu-ilmenau.de');
  fireEvent.changeText(screen.getByPlaceholderText('Min 8 chars, uppercase, number, symbol'), 'Secret123!');
  fireEvent.changeText(screen.getByPlaceholderText('Repeat your password'), 'Secret123!');
}

beforeEach(() => {
  jest.clearAllMocks();
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

  it('registers and routes to check-email with the normalized email', async () => {
    mockRegister.mockResolvedValue({ userId: 'u1', message: 'ok' });
    render(<RegisterScreen />);
    fillValidForm();
    submit();

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'student@tu-ilmenau.de',
        password: 'Secret123!',
        firstName: 'Max',
        lastName: 'Muster',
      });
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(auth)/check-email',
        params: { email: 'student@tu-ilmenau.de' },
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

  it('maps UNIVERSITY_NOT_SUPPORTED to an inline email error', async () => {
    mockRegister.mockRejectedValue(new ApiError('UNIVERSITY_NOT_SUPPORTED', 'nope', 422));
    render(<RegisterScreen />);
    fillValidForm();
    submit();

    await waitFor(() => {
      expect(screen.getByText('This university domain is not supported yet')).toBeTruthy();
    });
  });
});
