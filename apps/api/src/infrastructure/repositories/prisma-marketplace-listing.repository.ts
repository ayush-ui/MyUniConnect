import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  IMarketplaceListingRepository,
  CreateListingData,
  ListingsFilter,
  ListingsPage,
  ListingWithImages,
} from '../../domain/repositories/marketplace-listing.repository.interface';
import { MarketplaceListing, ListingStatus } from '../../domain/entities/marketplace-listing.entity';
import { ListingImage } from '../../domain/entities/listing-image.entity';

const LISTING_WITH_IMAGES = { images: { orderBy: { displayOrder: 'asc' as const } } };

@Injectable()
export class PrismaMarketplaceListingRepository implements IMarketplaceListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateListingData): Promise<ListingWithImages> {
    const row = await this.prisma.marketplaceListing.create({
      data: {
        sellerId: data.sellerId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        priceCents: data.priceCents,
        currency: data.currency,
        condition: data.condition as any,
        visibility: data.visibility as any,
        location: data.location,
        images: {
          create: data.imageKeys.map((s3Key, i) => ({ s3Key, displayOrder: i })),
        },
      },
      include: LISTING_WITH_IMAGES,
    });
    return this.toDomain(row);
  }

  async findById(id: string): Promise<ListingWithImages | null> {
    const row = await this.prisma.marketplaceListing.findFirst({
      where: { id, deletedAt: null },
      include: LISTING_WITH_IMAGES,
    });
    return row ? this.toDomain(row) : null;
  }

  async findMany(filter: ListingsFilter): Promise<ListingsPage> {
    const where: Prisma.MarketplaceListingWhereInput = {
      status: 'active',
      deletedAt: null,
      ...(!filter.includeStudentsOnly && { visibility: 'public' }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
      ...(filter.condition && { condition: filter.condition as any }),
      ...(filter.minPriceCents !== undefined && { priceCents: { gte: filter.minPriceCents } }),
      ...(filter.maxPriceCents !== undefined && {
        priceCents: { ...(filter.minPriceCents !== undefined ? { gte: filter.minPriceCents } : {}), lte: filter.maxPriceCents },
      }),
      ...(filter.search && {
        OR: [
          { title: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.MarketplaceListingOrderByWithRelationInput =
      filter.sortBy === 'price_asc' ? { priceCents: 'asc' }
      : filter.sortBy === 'price_desc' ? { priceCents: 'desc' }
      : { createdAt: 'desc' };

    const skip = (filter.page - 1) * filter.pageSize;

    const [rows, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({ where, orderBy, skip, take: filter.pageSize, include: LISTING_WITH_IMAGES }),
      this.prisma.marketplaceListing.count({ where }),
    ]);

    return { data: rows.map((r) => this.toDomain(r)), total, page: filter.page, pageSize: filter.pageSize };
  }

  async findBySellerId(sellerId: string): Promise<ListingWithImages[]> {
    const rows = await this.prisma.marketplaceListing.findMany({
      where: { sellerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: LISTING_WITH_IMAGES,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async countActiveListingsBySeller(sellerId: string): Promise<number> {
    return this.prisma.marketplaceListing.count({ where: { sellerId, status: 'active', deletedAt: null } });
  }

  async update(
    id: string,
    data: Partial<Pick<MarketplaceListing, 'title' | 'description' | 'priceCents' | 'condition' | 'visibility' | 'location'>>,
  ): Promise<ListingWithImages> {
    const row = await this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priceCents !== undefined && { priceCents: data.priceCents }),
        ...(data.condition !== undefined && { condition: data.condition as any }),
        ...(data.visibility !== undefined && { visibility: data.visibility as any }),
        ...(data.location !== undefined && { location: data.location }),
      },
      include: LISTING_WITH_IMAGES,
    });
    return this.toDomain(row);
  }

  async updateStatus(id: string, status: ListingStatus): Promise<MarketplaceListing> {
    const row = await this.prisma.marketplaceListing.update({
      where: { id },
      data: { status: status as any },
    });
    return this.toListingDomain(row);
  }

  private toDomain(row: any): ListingWithImages {
    return {
      ...this.toListingDomain(row),
      images: (row.images ?? []).map((img: any) => this.toImageDomain(img)),
    };
  }

  private toListingDomain(row: any): MarketplaceListing {
    return {
      id: row.id,
      sellerId: row.sellerId,
      categoryId: row.categoryId,
      title: row.title,
      description: row.description,
      priceCents: row.priceCents,
      currency: row.currency,
      condition: row.condition,
      visibility: row.visibility,
      status: row.status,
      location: row.location,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toImageDomain(row: any): ListingImage {
    return {
      id: row.id,
      listingId: row.listingId,
      s3Key: row.s3Key,
      displayOrder: row.displayOrder,
      createdAt: row.createdAt,
    };
  }
}
