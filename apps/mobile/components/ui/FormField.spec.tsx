import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { FormField } from './FormField';

describe('FormField', () => {
  it('renders the label', () => {
    render(<FormField label="University email" />);
    expect(screen.getByText('University email')).toBeTruthy();
  });

  it('shows the error message when provided', () => {
    render(<FormField label="Email" error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it('does not render an error node when no error is given', () => {
    render(<FormField label="Email" />);
    expect(screen.queryByText('Email is required')).toBeNull();
  });

  it('forwards typing through onChangeText', () => {
    const onChangeText = jest.fn();
    render(<FormField label="Email" placeholder="you@uni.de" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByPlaceholderText('you@uni.de'), 'student@tu-ilmenau.de');
    expect(onChangeText).toHaveBeenCalledWith('student@tu-ilmenau.de');
  });

  it('renders a right element when provided', () => {
    render(<FormField label="Password" rightElement={<Text>Show</Text>} />);
    expect(screen.getByText('Show')).toBeTruthy();
  });
});
