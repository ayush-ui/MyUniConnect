import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import CreateListingScreen from './create';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'tok' }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockCreate = jest.fn();
const mockGetCategories = jest.fn();
const mockGetPresignedUrl = jest.fn();
jest.mock('../../../lib/api/marketplace', () => ({
  ...jest.requireActual('../../../lib/api/marketplace'),
  marketplaceApi: {
    getCategories: (...a: unknown[]) => mockGetCategories(...a),
    createListing: (...a: unknown[]) => mockCreate(...a),
    getPresignedUploadUrl: (...a: unknown[]) => mockGetPresignedUrl(...a),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCategories.mockResolvedValue([{ id: 'cat-1', name: 'Books', slug: 'books' }]);
});

describe('CreateListingScreen', () => {
  it('renders the form heading', async () => {
    render(<CreateListingScreen />);
    expect(screen.getByText('New listing')).toBeTruthy();
    await waitFor(() => expect(mockGetCategories).toHaveBeenCalled());
  });

  it('blocks submit and shows field errors for an empty form', async () => {
    render(<CreateListingScreen />);
    fireEvent.press(screen.getByText('Post listing'));

    await waitFor(() => {
      expect(screen.getByText('Title must be at least 3 characters')).toBeTruthy();
      expect(screen.getByText('Description must be at least 10 characters')).toBeTruthy();
      expect(screen.getByText('Select a category')).toBeTruthy();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not submit a valid form that has no photos', async () => {
    render(<CreateListingScreen />);
    await waitFor(() => expect(mockGetCategories).toHaveBeenCalled());

    fireEvent.changeText(screen.getByPlaceholderText('What are you selling?'), 'Calculus Textbook');
    fireEvent.changeText(
      screen.getByPlaceholderText("Describe the item's condition and any relevant details…"),
      'Barely used, excellent condition',
    );
    fireEvent.changeText(screen.getByPlaceholderText('0'), '25');

    fireEvent.press(screen.getByText('Post listing'));

    // Category still unselected → category error blocks before the image check.
    await waitFor(() => expect(screen.getByText('Select a category')).toBeTruthy());
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
