/**
 * useMarketplace hook tests.
 *
 * Covers: initial load, category filter, refresh, error state,
 * and that the hook calls the marketplace API with the correct
 * access token from AuthContext.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMarketplace } from './useMarketplace';

// ── Mock marketplaceApi ────────────────────────────────────────────────────

const mockGetCategories = jest.fn();
const mockListListings = jest.fn();

jest.mock('../lib/api/marketplace', () => ({
  marketplaceApi: {
    getCategories: (...args: unknown[]) => mockGetCategories(...args),
    listListings: (...args: unknown[]) => mockListListings(...args),
  },
}));

// ── Mock AuthContext ───────────────────────────────────────────────────────

const mockUseAuth = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Test fixtures ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
  { id: 'cat-2', name: 'Books', slug: 'books' },
];

const LISTING = {
  id: 'lst-1',
  sellerId: 'usr-1',
  categoryId: 'cat-1',
  title: 'IKEA desk lamp',
  description: 'Barely used.',
  priceCents: 1500,
  currency: 'EUR',
  condition: 'like_new',
  visibility: 'students_only',
  status: 'active',
  location: 'Ilmenau',
  images: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const PAGE = { data: [LISTING], total: 1, page: 1, pageSize: 20 };

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ accessToken: 'acc-tok' });
  mockGetCategories.mockResolvedValue(CATEGORIES);
  mockListListings.mockResolvedValue(PAGE);
});

// ── Initial load ───────────────────────────────────────────────────────────

describe('useMarketplace — initial load', () => {
  it('starts with loading=true, then resolves categories and listings', async () => {
    const { result } = renderHook(() => useMarketplace());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories).toEqual(CATEGORIES);
    expect(result.current.listings).toEqual([LISTING]);
    expect(result.current.error).toBeNull();
  });

  it('passes accessToken to listListings', async () => {
    renderHook(() => useMarketplace());
    await waitFor(() => {
      expect(mockListListings).toHaveBeenCalledWith(
        expect.objectContaining({}),
        expect.objectContaining({ accessToken: 'acc-tok' }),
      );
    });
  });

  it('passes null opts when no accessToken', async () => {
    mockUseAuth.mockReturnValue({ accessToken: null });
    renderHook(() => useMarketplace());
    await waitFor(() => {
      expect(mockListListings).toHaveBeenCalledWith(expect.any(Object), undefined);
    });
  });
});

// ── Category filter ────────────────────────────────────────────────────────

describe('useMarketplace — category filter', () => {
  it('re-fetches listings when selectedCategoryId changes', async () => {
    const { result } = renderHook(() => useMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.setSelectedCategoryId('cat-1'); });

    await waitFor(() => {
      expect(mockListListings).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-1' }),
        expect.anything(),
      );
    });
  });

  it('passes undefined categoryId when filter is cleared', async () => {
    const { result } = renderHook(() => useMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.setSelectedCategoryId(null); });

    await waitFor(() => {
      const lastCall = mockListListings.mock.calls.at(-1)!;
      expect(lastCall[0].categoryId).toBeUndefined();
    });
  });
});

// ── Refresh ────────────────────────────────────────────────────────────────

describe('useMarketplace — refresh', () => {
  it('re-fetches listings without showing the main loading spinner', async () => {
    const { result } = renderHook(() => useMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const callCountBefore = mockListListings.mock.calls.length;

    await act(async () => { await result.current.refresh(); });

    expect(mockListListings.mock.calls.length).toBeGreaterThan(callCountBefore);
    expect(result.current.loading).toBe(false);
  });

  it('sets refreshing=true during refresh and false when done', async () => {
    let resolveListings!: (v: typeof PAGE) => void;
    mockListListings.mockImplementation(
      () => new Promise<typeof PAGE>((res) => { resolveListings = res; }),
    );

    const { result } = renderHook(() => useMarketplace());

    // Initial load — resolve immediately
    resolveListings(PAGE);
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Reset mock for the refresh call
    let resolveRefresh!: (v: typeof PAGE) => void;
    mockListListings.mockImplementation(
      () => new Promise<typeof PAGE>((res) => { resolveRefresh = res; }),
    );

    act(() => { void result.current.refresh(); });
    expect(result.current.refreshing).toBe(true);

    await act(async () => { resolveRefresh(PAGE); });
    expect(result.current.refreshing).toBe(false);
  });
});

// ── Error state ────────────────────────────────────────────────────────────

describe('useMarketplace — error handling', () => {
  it('sets error message when listListings rejects', async () => {
    mockListListings.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.listings).toEqual([]);
  });

  it('continues working if getCategories fails (categories stay empty)', async () => {
    mockGetCategories.mockRejectedValue(new Error('Categories unavailable'));
    const { result } = renderHook(() => useMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.categories).toEqual([]);
    // listings still loaded
    expect(result.current.listings).toEqual([LISTING]);
  });
});
