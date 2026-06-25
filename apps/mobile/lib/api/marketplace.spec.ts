/**
 * Marketplace API layer tests.
 *
 * Verifies that each marketplaceApi function:
 *  - Calls apiFetch / apiFetchRaw with the correct /api/v1/marketplace/... path
 *  - Passes the correct method, body, and options
 *  - Returns typed data on success
 *  - Re-throws ApiError from the underlying client
 */

import { marketplaceApi, storageUrl } from './marketplace';
import { ApiError } from './client';

// ── Mock the client module ─────────────────────────────────────────────────

const mockApiFetch = jest.fn();

jest.mock('./client', () => ({
  ...jest.requireActual('./client'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiFetchRaw: jest.fn(),
}));

// ── Test fixtures ──────────────────────────────────────────────────────────

const CATEGORY = { id: 'cat-1', name: 'Electronics', slug: 'electronics' };
const LISTING = {
  id: 'lst-1',
  sellerId: 'usr-1',
  categoryId: 'cat-1',
  title: 'IKEA desk lamp',
  description: 'Barely used desk lamp.',
  priceCents: 1500,
  currency: 'EUR',
  condition: 'like_new',
  visibility: 'students_only',
  status: 'active',
  location: 'Ilmenau',
  images: [{ id: 'img-1', s3Key: 'uploads/usr-1/abc.jpg', displayOrder: 0 }],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};
const PAGE = { data: [LISTING], total: 1, page: 1, pageSize: 20 };

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ── storageUrl ─────────────────────────────────────────────────────────────

describe('storageUrl', () => {
  it('prefixes key with a base URL', () => {
    const result = storageUrl('uploads/usr-1/photo.jpg');
    expect(result).toContain('uploads/usr-1/photo.jpg');
    expect(result).toMatch(/^https?:\/\//);
  });
});

// ── getCategories ──────────────────────────────────────────────────────────

describe('marketplaceApi.getCategories', () => {
  it('calls GET /api/v1/marketplace/categories', async () => {
    mockApiFetch.mockResolvedValue([CATEGORY]);
    const result = await marketplaceApi.getCategories();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/marketplace/categories');
    expect(result).toEqual([CATEGORY]);
  });

  it('re-throws ApiError from client', async () => {
    const err = new ApiError('INTERNAL_ERROR', 'Server error', 500);
    mockApiFetch.mockRejectedValue(err);
    await expect(marketplaceApi.getCategories()).rejects.toBeInstanceOf(ApiError);
  });
});

// ── listListings ───────────────────────────────────────────────────────────

describe('marketplaceApi.listListings', () => {
  it('calls /api/v1/marketplace/listings with no query string when no params', async () => {
    mockApiFetch.mockResolvedValue(PAGE);
    await marketplaceApi.listListings();
    const [path] = mockApiFetch.mock.calls[0];
    expect(path).toBe('/api/v1/marketplace/listings');
  });

  it('appends query params when provided', async () => {
    mockApiFetch.mockResolvedValue(PAGE);
    await marketplaceApi.listListings({ categoryId: 'cat-1', search: 'lamp', page: 2, sortBy: 'price_asc' });
    const [path] = mockApiFetch.mock.calls[0];
    expect(path).toContain('categoryId=cat-1');
    expect(path).toContain('search=lamp');
    expect(path).toContain('page=2');
    expect(path).toContain('sortBy=price_asc');
  });

  it('forwards opts (accessToken) to apiFetch', async () => {
    mockApiFetch.mockResolvedValue(PAGE);
    await marketplaceApi.listListings({}, { accessToken: 'tok' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/marketplace/listings'),
      expect.objectContaining({ accessToken: 'tok' }),
    );
  });

  it('passes no opts when opts is undefined', async () => {
    mockApiFetch.mockResolvedValue(PAGE);
    await marketplaceApi.listListings({});
    // second argument should be undefined
    expect(mockApiFetch).toHaveBeenCalledWith(expect.any(String), undefined);
  });

  it('returns typed listings page', async () => {
    mockApiFetch.mockResolvedValue(PAGE);
    const result = await marketplaceApi.listListings();
    expect(result.data[0].title).toBe('IKEA desk lamp');
    expect(result.total).toBe(1);
  });
});

// ── getListing ─────────────────────────────────────────────────────────────

describe('marketplaceApi.getListing', () => {
  it('calls /api/v1/marketplace/listings/:id', async () => {
    mockApiFetch.mockResolvedValue(LISTING);
    await marketplaceApi.getListing('lst-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/marketplace/listings/lst-1', undefined);
  });

  it('passes opts to allow authenticated access to students_only listings', async () => {
    mockApiFetch.mockResolvedValue(LISTING);
    await marketplaceApi.getListing('lst-1', { accessToken: 'student-tok' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/marketplace/listings/lst-1',
      expect.objectContaining({ accessToken: 'student-tok' }),
    );
  });

  it('re-throws LISTING_NOT_FOUND ApiError', async () => {
    const err = new ApiError('LISTING_NOT_FOUND', 'Not found', 404);
    mockApiFetch.mockRejectedValue(err);
    const caught = await marketplaceApi.getListing('bad-id').catch((e) => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('LISTING_NOT_FOUND');
  });

  it('re-throws FORBIDDEN ApiError for students_only as guest', async () => {
    const err = new ApiError('FORBIDDEN', 'Verified students only', 403);
    mockApiFetch.mockRejectedValue(err);
    const caught = await marketplaceApi.getListing('private-lst').catch((e) => e);
    expect((caught as ApiError).code).toBe('FORBIDDEN');
  });
});

// ── getMyListings ──────────────────────────────────────────────────────────

describe('marketplaceApi.getMyListings', () => {
  it('calls GET /api/v1/marketplace/my-listings with auth opts', async () => {
    mockApiFetch.mockResolvedValue([LISTING]);
    const result = await marketplaceApi.getMyListings({ accessToken: 'tok' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/marketplace/my-listings',
      expect.objectContaining({ accessToken: 'tok' }),
    );
    expect(result).toHaveLength(1);
  });

  it('re-throws 401 ApiError when unauthenticated', async () => {
    const err = new ApiError('UNAUTHORIZED', 'Unauthorized', 401);
    mockApiFetch.mockRejectedValue(err);
    const caught = await marketplaceApi.getMyListings({}).catch((e) => e);
    expect((caught as ApiError).status).toBe(401);
  });
});

// ── getPresignedUploadUrl ──────────────────────────────────────────────────

describe('marketplaceApi.getPresignedUploadUrl', () => {
  it('calls POST /api/v1/marketplace/upload-url with fileName and contentType', async () => {
    mockApiFetch.mockResolvedValue({ uploadUrl: 'https://s3.example.com/put', s3Key: 'uploads/u/a.jpg' });
    const result = await marketplaceApi.getPresignedUploadUrl('photo.jpg', 'image/jpeg', { accessToken: 'tok' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/marketplace/upload-url',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ fileName: 'photo.jpg', contentType: 'image/jpeg' }),
        accessToken: 'tok',
      }),
    );
    expect(result.s3Key).toBe('uploads/u/a.jpg');
  });
});

// ── createListing ──────────────────────────────────────────────────────────

describe('marketplaceApi.createListing', () => {
  const payload = {
    title: 'IKEA desk lamp',
    description: 'Barely used desk lamp.',
    priceCents: 1500,
    currency: 'EUR' as const,
    categoryId: 'cat-1',
    condition: 'like_new' as const,
    visibility: 'students_only' as const,
    imageKeys: ['uploads/usr-1/abc.jpg'],
  };

  it('calls POST /api/v1/marketplace/listings with correct body', async () => {
    mockApiFetch.mockResolvedValue(LISTING);
    await marketplaceApi.createListing(payload, { accessToken: 'tok' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/marketplace/listings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        accessToken: 'tok',
      }),
    );
  });

  it('re-throws LISTING_LIMIT_REACHED ApiError', async () => {
    const err = new ApiError('LISTING_LIMIT_REACHED', 'Limit reached', 422);
    mockApiFetch.mockRejectedValue(err);
    const caught = await marketplaceApi.createListing(payload, { accessToken: 'tok' }).catch((e) => e);
    expect((caught as ApiError).code).toBe('LISTING_LIMIT_REACHED');
  });

  it('re-throws CATEGORY_NOT_FOUND ApiError', async () => {
    const err = new ApiError('CATEGORY_NOT_FOUND', 'Not found', 422);
    mockApiFetch.mockRejectedValue(err);
    const caught = await marketplaceApi.createListing({ ...payload, categoryId: 'bad' }, { accessToken: 'tok' }).catch((e) => e);
    expect((caught as ApiError).code).toBe('CATEGORY_NOT_FOUND');
  });
});

// ── updateListing ──────────────────────────────────────────────────────────

describe('marketplaceApi.updateListing', () => {
  it('calls PATCH /api/v1/marketplace/listings/:id with update body', async () => {
    const updated = { ...LISTING, title: 'Updated lamp' };
    mockApiFetch.mockResolvedValue(updated);
    const result = await marketplaceApi.updateListing('lst-1', { title: 'Updated lamp' }, { accessToken: 'tok' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/marketplace/listings/lst-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated lamp' }),
      }),
    );
    expect(result.title).toBe('Updated lamp');
  });

  it('re-throws FORBIDDEN when caller is not owner', async () => {
    const err = new ApiError('FORBIDDEN', 'Not owner', 403);
    mockApiFetch.mockRejectedValue(err);
    const caught = await marketplaceApi.updateListing('lst-1', { title: 'X' }, { accessToken: 'other' }).catch((e) => e);
    expect((caught as ApiError).code).toBe('FORBIDDEN');
  });
});

// ── updateListingStatus ────────────────────────────────────────────────────

describe('marketplaceApi.updateListingStatus', () => {
  it('calls PATCH /api/v1/marketplace/listings/:id/status with new status', async () => {
    const reserved = { ...LISTING, status: 'reserved' };
    mockApiFetch.mockResolvedValue(reserved);
    const result = await marketplaceApi.updateListingStatus('lst-1', 'reserved', { accessToken: 'tok' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/marketplace/listings/lst-1/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'reserved' }),
      }),
    );
    expect(result.status).toBe('reserved');
  });

  it('re-throws LISTING_NOT_EDITABLE on invalid status transition', async () => {
    const err = new ApiError('LISTING_NOT_EDITABLE', 'Invalid transition', 422);
    mockApiFetch.mockRejectedValue(err);
    const caught = await marketplaceApi.updateListingStatus('lst-1', 'active', { accessToken: 'tok' }).catch((e) => e);
    expect((caught as ApiError).code).toBe('LISTING_NOT_EDITABLE');
  });
});
