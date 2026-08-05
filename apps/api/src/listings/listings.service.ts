import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  PublicInquiryResponse,
  PublicListing,
  PublicListingsResponse,
} from '@propertyflow/types';
import type { ListPublicListingsQuery, PublicInquiryInput } from '@propertyflow/validation';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Vacant units on active properties — the public rent/buy catalog. */
  async list(query: ListPublicListingsQuery): Promise<PublicListingsResponse> {
    const contains = query.search
      ? { contains: query.search, mode: 'insensitive' as const }
      : undefined;

    const units = await this.prisma.client.unit.findMany({
      where: {
        status: 'VACANT',
        property: { isActive: true },
        ...(contains
          ? {
              OR: [
                { label: contains },
                { property: { name: contains } },
                { property: { city: contains } },
                { property: { state: contains } },
                { property: { addressLine1: contains } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        label: true,
        bedrooms: true,
        bathrooms: true,
        squareFeet: true,
        marketRentCents: true,
        property: {
          select: {
            id: true,
            name: true,
            type: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
            yearBuilt: true,
            notes: true,
            imageUrl: true,
            organizationId: true,
          },
        },
      },
      orderBy: [{ property: { name: 'asc' } }, { label: 'asc' }],
      take: 100,
    });

    const listings: PublicListing[] = units.map((unit) => ({
      unitId: unit.id,
      label: unit.label,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      squareFeet: unit.squareFeet,
      marketRentCents: unit.marketRentCents,
      propertyId: unit.property.id,
      propertyName: unit.property.name,
      propertyType: unit.property.type,
      addressLine1: unit.property.addressLine1,
      city: unit.property.city,
      state: unit.property.state,
      postalCode: unit.property.postalCode,
      yearBuilt: unit.property.yearBuilt,
      description: unit.property.notes,
      imageUrl: unit.property.imageUrl,
      organizationId: unit.property.organizationId,
      facilities: facilitiesFor(unit.property.type, unit.bedrooms, unit.squareFeet),
    }));

    return { listings };
  }

  /**
   * Creates a NEW application from a public prospect. No login required — the
   * request lands in the staff Inquiries inbox for approve/deny.
   */
  async inquire(input: PublicInquiryInput): Promise<PublicInquiryResponse> {
    const unit = await this.prisma.client.unit.findFirst({
      where: { id: input.unitId, status: 'VACANT', property: { isActive: true } },
      select: {
        id: true,
        label: true,
        property: { select: { id: true, name: true, organizationId: true } },
      },
    });
    if (!unit) throw new BadRequestException('That home is no longer available');

    const interestLabel = input.interest === 'BUY' ? 'Buy' : 'Rent';
    const noteParts = [
      `Interest: ${interestLabel}`,
      input.notes?.trim() ? input.notes.trim() : null,
    ].filter(Boolean);

    const application = await this.prisma.client.application.create({
      data: {
        organizationId: unit.property.organizationId,
        unitId: unit.id,
        applicantName: input.applicantName,
        applicantEmail: input.applicantEmail,
        applicantPhone: input.applicantPhone ?? null,
        desiredMoveIn: input.desiredMoveIn ?? null,
        notes: noteParts.join('\n') || null,
        status: 'NEW',
      },
      select: { id: true },
    });

    await this.notifications.notifyPropertyStaff(
      unit.property.organizationId,
      unit.property.id,
      {
        type: 'GENERAL',
        title: `New ${interestLabel.toLowerCase()} inquiry`,
        body: `${input.applicantName} wants to ${interestLabel.toLowerCase()} ${unit.property.name} · ${unit.label}`,
        linkPath: '/dashboard/applications',
      },
    );

    return {
      message: `Thanks — your ${interestLabel.toLowerCase()} inquiry was sent. The team will follow up shortly.`,
      applicationId: application.id,
    };
  }
}

/** Commercial facility highlights for the public catalog (until a real amenities model ships). */
function facilitiesFor(
  type: PublicListing['propertyType'],
  bedrooms: number,
  squareFeet: number | null,
): string[] {
  const shared = ['24/7 maintenance', 'Secure entry', 'On-site management'];
  const extras: Record<PublicListing['propertyType'], string[]> = {
    APARTMENT: ['Elevator access', 'Laundry room', 'Resident lounge'],
    CONDO: ['Assigned parking', 'Fitness access', 'Private storage'],
    TOWNHOUSE: ['Private entrance', 'Outdoor patio', 'Garage option'],
    SINGLE_FAMILY: ['Private yard', 'Driveway parking', 'Quiet residential street'],
    MULTI_FAMILY: ['Shared courtyard', 'Guest parking', 'Bike storage'],
    COMMERCIAL: ['Street frontage', 'Flexible floor plan', 'Client parking'],
  };
  const size =
    squareFeet && squareFeet >= 1200
      ? ['Spacious layout']
      : squareFeet && squareFeet >= 800
        ? ['Open living area']
        : [];
  const beds = bedrooms >= 3 ? ['Family-sized bedrooms'] : bedrooms === 0 ? ['Studio layout'] : [];
  return [...shared, ...extras[type], ...size, ...beds].slice(0, 8);
}
