import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { PublicInquiryResponse, PublicListingsResponse } from '@propertyflow/types';
import {
  listPublicListingsQuerySchema,
  publicInquirySchema,
  type ListPublicListingsQuery,
  type PublicInquiryInput,
} from '@propertyflow/validation';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  @Public()
  list(
    @Query(new ZodValidationPipe(listPublicListingsQuerySchema)) query: ListPublicListingsQuery,
  ): Promise<PublicListingsResponse> {
    return this.listings.list(query);
  }

  @Post('inquire')
  @Public()
  inquire(
    @Body(new ZodValidationPipe(publicInquirySchema)) input: PublicInquiryInput,
  ): Promise<PublicInquiryResponse> {
    return this.listings.inquire(input);
  }
}
