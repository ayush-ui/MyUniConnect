import { ListingImage } from './listing-image.entity';

export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type ListingVisibility = 'students_only' | 'public';
export type ListingStatus = 'active' | 'reserved' | 'sold' | 'deactivated';

export const VALID_STATUS_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  active: ['reserved', 'sold', 'deactivated'],
  reserved: ['active', 'sold', 'deactivated'],
  sold: [],
  deactivated: ['active'],
};

export interface MarketplaceListing {
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
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  images?: ListingImage[];
}
