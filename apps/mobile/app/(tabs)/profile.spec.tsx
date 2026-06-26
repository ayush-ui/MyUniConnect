import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ProfileScreen from './profile';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

let mockUser: Record<string, unknown> | null = null;
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: jest.fn() }),
}));

const VERIFIED = {
  firstName: 'Max',
  lastName: 'Muster',
  email: 'student@tu-ilmenau.de',
  accountType: 'student',
  studentStatus: 'verified',
  isVerifiedStudent: true,
  university: { id: 'uni-1', name: 'TU Ilmenau' },
  claimedUniversityName: null,
};

beforeEach(() => jest.clearAllMocks());

describe('ProfileScreen', () => {
  it('shows the verified badge with university and the My listings row', () => {
    mockUser = VERIFIED;
    render(<ProfileScreen />);
    expect(screen.getByText('Max Muster')).toBeTruthy();
    expect(screen.getByText('✓ Verified student · TU Ilmenau')).toBeTruthy();
    expect(screen.getByText('My listings')).toBeTruthy();
  });

  it('shows the pending panel and hides My listings for a pending student', () => {
    mockUser = {
      ...VERIFIED,
      studentStatus: 'pending',
      isVerifiedStudent: false,
      university: null,
      claimedUniversityName: 'University of Stuttgart',
    };
    render(<ProfileScreen />);
    expect(screen.getByText('⏳ Verification pending')).toBeTruthy();
    expect(screen.getByText('Verification under review')).toBeTruthy();
    expect(screen.queryByText('My listings')).toBeNull();
  });

  it('shows the visitor badge for a non-student and no pending panel', () => {
    mockUser = {
      ...VERIFIED,
      accountType: 'non_student',
      studentStatus: 'none',
      isVerifiedStudent: false,
      university: null,
      claimedUniversityName: null,
    };
    render(<ProfileScreen />);
    expect(screen.getByText('Visitor')).toBeTruthy();
    expect(screen.queryByText('Verification under review')).toBeNull();
    expect(screen.queryByText('My listings')).toBeNull();
  });
});
