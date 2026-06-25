import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsEnum, IsOptional, IsArray, IsUUID, Min, Max, MaxLength, MinLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ItemCondition, ListingVisibility, ListingStatus } from '../../../domain/entities/marketplace-listing.entity';
import { ListingImage } from '../../../domain/entities/listing-image.entity';

export class CreateListingDto {
  @ApiProperty({ example: 'Used Laptop', maxLength: 100 })
  @IsString() @MinLength(3) @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Great condition, barely used.', maxLength: 2000 })
  @IsString() @MinLength(10) @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 50000, description: 'Price in Euro cents. 0 = free.' })
  @IsInt() @Min(0) @Max(999900)
  @Type(() => Number)
  priceCents: number;

  @ApiProperty({ enum: ['EUR'], default: 'EUR' })
  @IsEnum(['EUR'])
  currency: 'EUR';

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ enum: ['new', 'like_new', 'good', 'fair', 'poor'] })
  @IsEnum(['new', 'like_new', 'good', 'fair', 'poor'])
  condition: ItemCondition;

  @ApiProperty({ enum: ['students_only', 'public'], default: 'students_only' })
  @IsEnum(['students_only', 'public'])
  visibility: ListingVisibility;

  @ApiPropertyOptional({ example: 'Ilmenau', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  location?: string;

  @ApiProperty({ type: [String], description: 'S3 keys from /upload-url, 1–10 items', minItems: 1, maxItems: 10 })
  @IsArray() @IsString({ each: true }) @ArrayMinSize(1) @ArrayMaxSize(10)
  imageKeys: string[];
}

export class UpdateListingDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional() @IsString() @MinLength(3) @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional() @IsString() @MinLength(10) @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0) @Max(999900)
  @Type(() => Number)
  priceCents?: number;

  @ApiPropertyOptional({ enum: ['new', 'like_new', 'good', 'fair', 'poor'] })
  @IsOptional() @IsEnum(['new', 'like_new', 'good', 'fair', 'poor'])
  condition?: ItemCondition;

  @ApiPropertyOptional({ enum: ['students_only', 'public'] })
  @IsOptional() @IsEnum(['students_only', 'public'])
  visibility?: ListingVisibility;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  location?: string | null;
}

export class UpdateListingStatusDto {
  @ApiProperty({ enum: ['active', 'reserved', 'sold', 'deactivated'] })
  @IsEnum(['active', 'reserved', 'sold', 'deactivated'])
  status: ListingStatus;
}

export class GetPresignedUploadUrlDto {
  @ApiProperty({ example: 'photo.jpg' })
  @IsString() @MaxLength(255)
  fileName: string;

  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  @IsEnum(['image/jpeg', 'image/png', 'image/webp'])
  contentType: string;
}

export class ListListingsQueryDto {
  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['new', 'like_new', 'good', 'fair', 'poor'] })
  @IsOptional() @IsEnum(['new', 'like_new', 'good', 'fair', 'poor'])
  condition?: ItemCondition;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  minPriceCents?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  maxPriceCents?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional() @IsInt() @Min(1) @Max(50) @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({ enum: ['newest', 'price_asc', 'price_desc'], default: 'newest' })
  @IsOptional() @IsEnum(['newest', 'price_asc', 'price_desc'])
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class ListingImageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() s3Key: string;
  @ApiProperty() displayOrder: number;
}

export class ListingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() sellerId: string;
  @ApiProperty() categoryId: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() priceCents: number;
  @ApiProperty() currency: string;
  @ApiProperty({ enum: ['new', 'like_new', 'good', 'fair', 'poor'] }) condition: ItemCondition;
  @ApiProperty({ enum: ['students_only', 'public'] }) visibility: ListingVisibility;
  @ApiProperty({ enum: ['active', 'reserved', 'sold', 'deactivated'] }) status: ListingStatus;
  @ApiPropertyOptional() location: string | null;
  @ApiProperty({ type: [ListingImageResponseDto] }) images: ListingImageResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ListingsPageResponseDto {
  @ApiProperty({ type: [ListingResponseDto] }) data: ListingResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
}

export class PresignedUploadUrlResponseDto {
  @ApiProperty() uploadUrl: string;
  @ApiProperty() s3Key: string;
}

export class CategoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
}

function toImageDto(img: ListingImage): ListingImageResponseDto {
  return { id: img.id, s3Key: img.s3Key, displayOrder: img.displayOrder };
}

export function toListingDto(listing: any): ListingResponseDto {
  return {
    id: listing.id,
    sellerId: listing.sellerId,
    categoryId: listing.categoryId,
    title: listing.title,
    description: listing.description,
    priceCents: listing.priceCents,
    currency: listing.currency,
    condition: listing.condition,
    visibility: listing.visibility,
    status: listing.status,
    location: listing.location,
    images: (listing.images ?? []).map(toImageDto),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}
