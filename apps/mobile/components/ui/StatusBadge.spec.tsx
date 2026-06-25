import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['active', 'Active'],
    ['reserved', 'Reserved'],
    ['sold', 'Sold'],
    ['deactivated', 'Inactive'],
  ] as const)('renders "%s" status as label "%s"', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
