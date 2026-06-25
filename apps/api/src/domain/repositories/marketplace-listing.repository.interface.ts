import { MarketplaceListing, ItemCondition, ListingVisibility, ListingStatus } from '../entities/marketplace-listing.entity';
import { ListingImage } from '../entities/listing-image.entity';

export type ListingWithImages = MarketplaceListing & { images: ListingImage[] };

export interface CreateListingData {
  sellerId: string;
  categoryId: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  condition: ItemCondition;
  visibility: ListingVisibility;
  location: string | null;
  imageKeys: string[];
}

export interface ListingsFilter {
  categoryId?: string;
  condition?: ItemCondition;
  minPriceCents?: number;
  maxPriceCents?: number;
  search?: string;
  /** If false, only 'public' listings are returned (for unauthenticated callers) */
  includeStudentsOnly: boolean;
  page: number;
  pageSize: number;
  sortBy: 'newest' | 'price_asc' | 'price_desc';
}

export interface ListingsPage {
  data: ListingWithImages[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IMarketplaceListingRepository {
  create(data: CreateListingData): Promise<ListingWithImages>;
  findById(id: string): Promise<ListingWithImages | null>;
  findMany(filter: ListingsFilter): Promise<ListingsPage>;
  findBySellerId(sellerId: string): Promise<ListingWithImages[]>;
  countActiveListingsBySeller(sellerId: string): Promise<number>;
  update(id: string, data: Partial<Pick<MarketplaceListing, 'title' | 'description' | 'priceCents' | 'condition' | 'visibility' | 'location'>>): Promise<ListingWithImages>;
  updateStatus(id: string, status: ListingStatus): Promise<MarketplaceListing>;
}

export const MARKETPLACE_LISTING_REPOSITORY = Symbol('IMarketplaceListingRepository');
