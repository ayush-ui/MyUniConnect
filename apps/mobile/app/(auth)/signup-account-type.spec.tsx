import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import SignupAccountTypeScreen from './signup-account-type';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => jest.clearAllMocks());

describe('SignupAccountTypeScreen', () => {
  it('does not continue until a choice is made', () => {
    render(<SignupAccountTypeScreen />);
    fireEvent.press(screen.getByText('Continue'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('routes a student to the university step', () => {
    render(<SignupAccountTypeScreen />);
    fireEvent.press(screen.getByText("I'm a student"));
    fireEvent.press(screen.getByText('Continue'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/signup-university');
  });

  it('routes a non-student straight to the register fields', () => {
    render(<SignupAccountTypeScreen />);
    fireEvent.press(screen.getByText("I'm not a student"));
    fireEvent.press(screen.getByText('Continue'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(auth)/register',
      params: { accountType: 'non_student' },
    });
  });
});
