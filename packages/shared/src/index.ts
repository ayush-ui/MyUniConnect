// Shared types used by both the API and the web app

export type UserRole = 'student' | 'admin';

export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

export type ListingVisibility = 'students_only' | 'public';

export type MarketplaceListingStatus = 'active' | 'reserved' | 'sold' | 'deactivated';

export type HousingType =
  | 'full_apartment'
  | 'room_in_shared_flat'
  | 'sublet'
  | 'short_term'
  | 'flatmate_wanted';

export type HousingListingStatus = 'available' | 'reserved' | 'rented' | 'deactivated';

export type ClubVisibility = 'university_only' | 'open';

export type ClubRole = 'admin' | 'member';

export const SUPPORTED_UNIVERSITY_DOMAINS = ['tu-ilmenau.de'] as const;

export type SupportedUniversityDomain = (typeof SUPPORTED_UNIVERSITY_DOMAINS)[number];
