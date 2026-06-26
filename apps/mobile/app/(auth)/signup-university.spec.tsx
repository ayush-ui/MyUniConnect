import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import SignupUniversityScreen from './signup-university';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUniversities = jest.fn();
jest.mock('../../lib/api/auth', () => ({
  authApi: { universities: () => mockUniversities() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUniversities.mockResolvedValue([
    { id: 'uni-1', name: 'TU Ilmenau' },
    { id: 'uni-2', name: 'TU Dresden' },
  ]);
});

describe('SignupUniversityScreen', () => {
  it('loads and lists partner universities', async () => {
    render(<SignupUniversityScreen />);
    expect(await screen.findByText('TU Ilmenau')).toBeTruthy();
    expect(screen.getByText('TU Dresden')).toBeTruthy();
  });

  it('continues with the selected partner universityId', async () => {
    render(<SignupUniversityScreen />);
    fireEvent.press(await screen.findByText('TU Dresden'));
    fireEvent.press(screen.getByText('Continue'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(auth)/register',
      params: { accountType: 'student', universityId: 'uni-2' },
    });
  });

  it('reveals a free-text field for "Other" and continues with the claimed name', async () => {
    render(<SignupUniversityScreen />);
    fireEvent.press(await screen.findByText('Other (Not listed above)'));

    const input = screen.getByPlaceholderText('e.g. University of Stuttgart');
    fireEvent.changeText(input, 'University of Stuttgart');
    fireEvent.press(screen.getByText('Continue'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(auth)/register',
      params: { accountType: 'student', claimedUniversityName: 'University of Stuttgart' },
    });
  });

  it('does not continue when "Other" is chosen but no name entered', async () => {
    render(<SignupUniversityScreen />);
    fireEvent.press(await screen.findByText('Other (Not listed above)'));
    fireEvent.press(screen.getByText('Continue'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
