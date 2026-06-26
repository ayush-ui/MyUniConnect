import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { VerifiedStudentBadge, badgeVariantFor } from './VerifiedStudentBadge';

describe('badgeVariantFor', () => {
  it('returns "verified" when isVerifiedStudent is true', () => {
    expect(badgeVariantFor('student', 'verified', true)).toBe('verified');
  });

  it('returns "pending" for a pending student', () => {
    expect(badgeVariantFor('student', 'pending', false)).toBe('pending');
  });

  it('returns "visitor" for a non-student', () => {
    expect(badgeVariantFor('non_student', 'none', false)).toBe('visitor');
  });

  it('returns "none" for anything else (e.g. rejected)', () => {
    expect(badgeVariantFor('student', 'rejected', false)).toBe('none');
  });
});

describe('VerifiedStudentBadge', () => {
  it('renders the verified label with university (md)', () => {
    render(<VerifiedStudentBadge variant="verified" universityName="TU Ilmenau" />);
    expect(screen.getByText('✓ Verified student · TU Ilmenau')).toBeTruthy();
  });

  it('renders a compact verified label (sm) without university', () => {
    render(<VerifiedStudentBadge variant="verified" universityName="TU Ilmenau" size="sm" />);
    expect(screen.getByText('✓ Verified')).toBeTruthy();
  });

  it('renders the pending label', () => {
    render(<VerifiedStudentBadge variant="pending" />);
    expect(screen.getByText('⏳ Verification pending')).toBeTruthy();
  });

  it('renders the visitor label', () => {
    render(<VerifiedStudentBadge variant="visitor" />);
    expect(screen.getByText('Visitor')).toBeTruthy();
  });

  it('renders nothing for the "none" variant', () => {
    render(<VerifiedStudentBadge variant="none" />);
    expect(screen.queryByText(/Verified|pending|Visitor/)).toBeNull();
  });
});
