import React from 'react';
import { Alert } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import ListingDetailScreen from './[id]';

const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: 'lst-1' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'tok' }),
}));

const mockGetListing = jest.fn();
const mockGetCategories = jest.fn();
jest.mock('../../../lib/api/marketplace', () => ({
  ...jest.requireActual('../../../lib/api/marketplace'),
  marketplaceApi: {
    getListing: (...a: unknown[]) => mockGetListing(...a),
    getCategories: (...a: unknown[]) => mockGetCategories(...a),
  },
}));

const LISTING = {
  id: 'lst-1',
  sellerId: 's1',
  categoryId: 'cat-1',
  title: 'Calculus Textbook',
  description: 'Barely used, great condition',
  priceCents: 2500,
  currency: 'EUR',
  condition: 'good',
  visibility: 'students_only',
  status: 'active',
  location: 'Campus',
  images: [],
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'lst-1' };
  mockGetCategories.mockResolvedValue([{ id: 'cat-1', name: 'Books', slug: 'books' }]);
});

describe('ListingDetailScreen', () => {
  it('shows a spinner before data loads', () => {
    mockGetListing.mockReturnValue(new Promise(() => {}));
    render(<ListingDetailScreen />);
    expect(screen.queryByText('Calculus Textbook')).toBeNull();
  });

  it('renders the listing once loaded', async () => {
    mockGetListing.mockResolvedValue(LISTING);
    render(<ListingDetailScreen />);
    expect(await screen.findByText('Calculus Textbook')).toBeTruthy();
    expect(screen.getByText('€25')).toBeTruthy();
    expect(screen.getByText('Barely used, great condition')).toBeTruthy();
  });

  it('shows an error message on load failure', async () => {
    mockGetListing.mockRejectedValue(new Error('boom'));
    render(<ListingDetailScreen />);
    expect(await screen.findByText('Could not load listing.')).toBeTruthy();
  });

  it('opens the contact-seller alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetListing.mockResolvedValue(LISTING);
    render(<ListingDetailScreen />);
    fireEvent.press(await screen.findByText('Contact seller'));
    expect(alertSpy).toHaveBeenCalledWith('Contact Seller', expect.any(String), expect.anything());
    alertSpy.mockRestore();
  });
});
