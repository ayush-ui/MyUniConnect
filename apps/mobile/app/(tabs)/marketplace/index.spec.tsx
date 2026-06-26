import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import MarketplaceScreen from './index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

let mockUser: Record<string, unknown> | null = { isVerifiedStudent: true, accountType: 'student' };
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockSetSelectedCategoryId = jest.fn();
const mockRefresh = jest.fn();
let mockHookState: Record<string, unknown>;
jest.mock('../../../hooks/useMarketplace', () => ({
  useMarketplace: () => mockHookState,
}));

const CATEGORIES = [
  { id: 'cat-1', name: 'Books', slug: 'books' },
  { id: 'cat-2', name: 'Electronics', slug: 'electronics' },
];

function makeListing(overrides = {}) {
  return {
    id: 'lst-1',
    sellerId: 's1',
    categoryId: 'cat-1',
    title: 'Calculus Textbook',
    description: 'Barely used',
    priceCents: 2500,
    currency: 'EUR',
    condition: 'good',
    visibility: 'students_only',
    status: 'active',
    location: 'Campus',
    images: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function setHook(overrides = {}) {
  mockHookState = {
    categories: CATEGORIES,
    listings: [makeListing()],
    selectedCategoryId: null,
    setSelectedCategoryId: mockSetSelectedCategoryId,
    loading: false,
    refreshing: false,
    error: null,
    refresh: mockRefresh,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  setHook();
  mockUser = { isVerifiedStudent: true, accountType: 'student' };
});

describe('MarketplaceScreen', () => {
  it('renders listings with formatted price', () => {
    render(<MarketplaceScreen />);
    expect(screen.getByText('Calculus Textbook')).toBeTruthy();
    expect(screen.getByText('€25')).toBeTruthy();
  });

  it('renders "Free" for a zero-price listing', () => {
    setHook({ listings: [makeListing({ priceCents: 0 })] });
    render(<MarketplaceScreen />);
    expect(screen.getByText('Free')).toBeTruthy();
  });

  it('shows a spinner while loading', () => {
    setHook({ loading: true });
    render(<MarketplaceScreen />);
    expect(screen.queryByText('Calculus Textbook')).toBeNull();
  });

  it('shows the error message on failure', () => {
    setHook({ error: 'Could not load listings. Pull down to refresh.', listings: [] });
    render(<MarketplaceScreen />);
    expect(screen.getByText('Could not load listings. Pull down to refresh.')).toBeTruthy();
  });

  it('shows the empty state when there are no listings', () => {
    setHook({ listings: [] });
    render(<MarketplaceScreen />);
    expect(screen.getByText(/No listings yet/)).toBeTruthy();
  });

  it('renders category chips and filters on tap', () => {
    render(<MarketplaceScreen />);
    fireEvent.press(screen.getByText('Electronics'));
    expect(mockSetSelectedCategoryId).toHaveBeenCalledWith('cat-2');
  });

  it('navigates to a listing detail on card tap', () => {
    render(<MarketplaceScreen />);
    fireEvent.press(screen.getByText('Calculus Textbook'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/marketplace/lst-1');
  });

  it('navigates to create on the + button for a verified student', () => {
    render(<MarketplaceScreen />);
    fireEvent.press(screen.getByText('+'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/marketplace/create');
  });

  it('opens the pending locked sheet for a pending student instead of navigating', () => {
    mockUser = { isVerifiedStudent: false, accountType: 'student' };
    render(<MarketplaceScreen />);
    fireEvent.press(screen.getByText('+'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Posting is almost ready')).toBeTruthy();
  });

  it('opens the non-student locked sheet for a non-student instead of navigating', () => {
    mockUser = { isVerifiedStudent: false, accountType: 'non_student' };
    render(<MarketplaceScreen />);
    fireEvent.press(screen.getByText('+'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText("Posting isn't available")).toBeTruthy();
  });
});
