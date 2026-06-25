import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe,
  Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiResponse, ApiTags,
  ApiBadRequestResponse, ApiNotFoundResponse, ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TokenPayload } from '../../application/auth/token.service.interface';
import { CreateListingUseCase } from '../../application/marketplace/create-listing.use-case';
import { GetPresignedUploadUrlUseCase } from '../../application/marketplace/get-presigned-upload-url.use-case';
import { ListListingsUseCase } from '../../application/marketplace/list-listings.use-case';
import { GetListingUseCase } from '../../application/marketplace/get-listing.use-case';
import { UpdateListingUseCase } from '../../application/marketplace/update-listing.use-case';
import { UpdateListingStatusUseCase } from '../../application/marketplace/update-listing-status.use-case';
import { GetMyListingsUseCase } from '../../application/marketplace/get-my-listings.use-case';
import { GetCategoriesUseCase } from '../../application/marketplace/get-categories.use-case';
import {
  CreateListingDto, UpdateListingDto, UpdateListingStatusDto, GetPresignedUploadUrlDto,
  ListListingsQueryDto, ListingResponseDto, ListingsPageResponseDto,
  PresignedUploadUrlResponseDto, CategoryResponseDto, toListingDto,
} from './dto/listing.dto';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly createListing: CreateListingUseCase,
    private readonly getPresignedUrl: GetPresignedUploadUrlUseCase,
    private readonly listListings: ListListingsUseCase,
    private readonly getListing: GetListingUseCase,
    private readonly updateListing: UpdateListingUseCase,
    private readonly updateListingStatus: UpdateListingStatusUseCase,
    private readonly getMyListings: GetMyListingsUseCase,
    private readonly getCategories: GetCategoriesUseCase,
  ) {}

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all marketplace categories' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async categories(): Promise<CategoryResponseDto[]> {
    const cats = await this.getCategories.execute();
    return cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  }

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a presigned S3 URL to upload a listing image' })
  @ApiResponse({ status: 200, type: PresignedUploadUrlResponseDto })
  @ApiUnauthorizedResponse()
  async uploadUrl(
    @CurrentUser() user: TokenPayload,
    @Body() dto: GetPresignedUploadUrlDto,
  ): Promise<PresignedUploadUrlResponseDto> {
    return this.getPresignedUrl.execute({ callerId: user.sub, fileName: dto.fileName, contentType: dto.contentType });
  }

  @Post('listings')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a marketplace listing' })
  @ApiResponse({ status: 201, type: ListingResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  async create(@CurrentUser() user: TokenPayload, @Body() dto: CreateListingDto): Promise<ListingResponseDto> {
    const listing = await this.createListing.execute({
      callerId: user.sub,
      title: dto.title,
      description: dto.description,
      priceCents: dto.priceCents,
      currency: dto.currency,
      categoryId: dto.categoryId,
      condition: dto.condition,
      visibility: dto.visibility,
      location: dto.location ?? null,
      imageKeys: dto.imageKeys,
    });
    return toListingDto(listing);
  }

  @Get('listings')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List marketplace listings (public listings visible to all; students_only to verified users only)' })
  @ApiResponse({ status: 200, type: ListingsPageResponseDto })
  async list(@Req() req: Request, @Query() query: ListListingsQueryDto): Promise<ListingsPageResponseDto> {
    const user = (req as any).user as TokenPayload | undefined;
    const result = await this.listListings.execute({
      isVerifiedStudent: !!user,
      categoryId: query.categoryId,
      condition: query.condition,
      minPriceCents: query.minPriceCents,
      maxPriceCents: query.maxPriceCents,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
    });
    return { ...result, data: result.data.map(toListingDto) };
  }

  @Get('my-listings')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all listings belonging to the authenticated user' })
  @ApiResponse({ status: 200, type: [ListingResponseDto] })
  @ApiUnauthorizedResponse()
  async myListings(@CurrentUser() user: TokenPayload): Promise<ListingResponseDto[]> {
    const listings = await this.getMyListings.execute({ callerId: user.sub });
    return listings.map(toListingDto);
  }

  @Get('listings/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a single listing by ID' })
  @ApiResponse({ status: 200, type: ListingResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async getOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string): Promise<ListingResponseDto> {
    const user = (req as any).user as TokenPayload | undefined;
    const listing = await this.getListing.execute({ listingId: id, isVerifiedStudent: !!user });
    return toListingDto(listing);
  }

  @Patch('listings/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a listing (owner only)' })
  @ApiResponse({ status: 200, type: ListingResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  async update(
    @CurrentUser() user: TokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
  ): Promise<ListingResponseDto> {
    const listing = await this.updateListing.execute({ callerId: user.sub, listingId: id, ...dto });
    return toListingDto(listing);
  }

  @Patch('listings/:id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update listing status (owner only). Valid transitions: active↔reserved, active→sold/deactivated, deactivated→active' })
  @ApiResponse({ status: 200, type: ListingResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  async updateStatus(
    @CurrentUser() user: TokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingStatusDto,
  ): Promise<ListingResponseDto> {
    const listing = await this.updateListingStatus.execute({ callerId: user.sub, listingId: id, newStatus: dto.status });
    return toListingDto(listing);
  }
}
