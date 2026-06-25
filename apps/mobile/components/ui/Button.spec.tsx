import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import { Button } from './Button';

describe('Button', () => {
  it('renders the label', () => {
    render(<Button label="Log in" />);
    expect(screen.getByText('Log in')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button label="Log in" onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner and hides the label while loading', () => {
    render(<Button label="Log in" loading testID="btn" />);
    expect(screen.queryByText('Log in')).toBeNull();
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not call onPress while loading', () => {
    const onPress = jest.fn();
    render(<Button label="Log in" loading onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Log in" disabled onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
