import { apiFetch, FetchOptions } from './client';

const MARKETPLACE = '/api/v1/marketplace';

const STORAGE_BASE_URL =
  process.env.EXPO_PUBLIC_STORAGE_BASE_URL ?? 'https://nbg1.your-objectstorage.com/uniconnect';

/** Converts an S3 key to a publicly accessible Hetzner Object Storage URL. */
export function storageUrl(s3Key: string): string {
  return `${STORAGE_BASE_URL}/${s3Key}`;
}

export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type ListingVisibility = 'students_only' | 'public';
export type ListingStatus = 'active' | 'reserved' | 'sold' | 'deactivated';

export interface ListingImage {
  id: string;
  s3Key: string;
  displayOrder: number;
}

export interface Listing {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  condition: ItemCondition;
  visibility: ListingVisibility;
  status: ListingStatus;
  location: string | null;
  images: ListingImage[];
  createdAt: string;
  updatedAt: string;
}

export interface ListingsPage {
  data: Listing[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ListListingsParams {
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
}

export interface CreateListingData {
  title: string;
  description: string;
  priceCents: number;
  currency: 'EUR';
  categoryId: string;
  condition: ItemCondition;
  visibility: ListingVisibility;
  location?: string;
  imageKeys: string[];
}

export interface UpdateListingData {
  title?: string;
  description?: string;
  priceCents?: number;
  categoryId?: string;
  condition?: ItemCondition;
  visibility?: ListingVisibility;
  location?: string;
}

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export const marketplaceApi = {
  async getCategories(): Promise<Category[]> {
    return apiFetch(`${MARKETPLACE}/categories`);
  },

  async listListings(params: ListListingsParams = {}, opts?: FetchOptions): Promise<ListingsPage> {
    const q = new URLSearchParams();
    if (params.categoryId) q.set('categoryId', params.categoryId);
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.sortBy) q.set('sortBy', params.sortBy);
    const qs = q.toString();
    return apiFetch(`${MARKETPLACE}/listings${qs ? `?${qs}` : ''}`, opts);
  },

  async getListing(id: string, opts?: FetchOptions): Promise<Listing> {
    return apiFetch(`${MARKETPLACE}/listings/${id}`, opts);
  },

  async getMyListings(opts: FetchOptions): Promise<Listing[]> {
    return apiFetch(`${MARKETPLACE}/my-listings`, opts);
  },

  async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    opts: FetchOptions,
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    return apiFetch(`${MARKETPLACE}/upload-url`, {
      ...opts,
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    });
  },

  async createListing(data: CreateListingData, opts: FetchOptions): Promise<Listing> {
    return apiFetch(`${MARKETPLACE}/listings`, {
      ...opts,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateListing(id: string, data: UpdateListingData, opts: FetchOptions): Promise<Listing> {
    return apiFetch(`${MARKETPLACE}/listings/${id}`, {
      ...opts,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateListingStatus(id: string, status: ListingStatus, opts: FetchOptions): Promise<Listing> {
    return apiFetch(`${MARKETPLACE}/listings/${id}/status`, {
      ...opts,
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
