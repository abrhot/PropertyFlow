import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@propertyflow/database';
import type {
  AccountProfile,
  NotificationPreferences,
  OrganizationProfile,
  RequestUser,
  SettingsResponse,
  UpdateNotificationPreferencesRequest,
  UpdateOrganizationProfileRequest,
  UpdateProfileRequest,
} from '@propertyflow/types';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  notifyByEmail: true,
  notifyPayments: true,
  notifyMaintenance: true,
  notifyMessages: true,
  notifyAnnouncements: true,
} satisfies Prisma.UserSelect;
type UserRecord = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

const ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  subscriptionTier: true,
  contactEmail: true,
  contactPhone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  postalCode: true,
  websiteUrl: true,
} satisfies Prisma.OrganizationSelect;
type OrgRecord = Prisma.OrganizationGetPayload<{ select: typeof ORG_SELECT }>;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: RequestUser): Promise<SettingsResponse> {
    const record = await this.prisma.client.user.findUnique({
      where: { id: user.id },
      select: USER_SELECT,
    });
    if (!record) throw new NotFoundException('Account not found');

    const organization = user.organizationId
      ? await this.prisma.client.organization.findUnique({
          where: { id: user.organizationId },
          select: ORG_SELECT,
        })
      : null;

    return {
      profile: toAccountProfile(record),
      organization: organization ? toOrganizationProfile(organization) : null,
      notifications: toNotificationPreferences(record),
    };
  }

  async updateOrganizationProfile(
    user: RequestUser,
    input: UpdateOrganizationProfileRequest,
  ): Promise<OrganizationProfile> {
    if (!user.organizationId) {
      throw new ForbiddenException('Your account is not attached to an organization');
    }
    const record = await this.prisma.client.organization.update({
      where: { id: user.organizationId },
      data: input,
      select: ORG_SELECT,
    });
    return toOrganizationProfile(record);
  }

  async updateNotifications(
    user: RequestUser,
    input: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreferences> {
    const record = await this.prisma.client.user.update({
      where: { id: user.id },
      data: input,
      select: USER_SELECT,
    });
    return toNotificationPreferences(record);
  }

  async updateProfile(user: RequestUser, input: UpdateProfileRequest): Promise<AccountProfile> {
    const record = await this.prisma.client.user.update({
      where: { id: user.id },
      data: input,
      select: USER_SELECT,
    });
    return toAccountProfile(record);
  }
}

function toAccountProfile(record: UserRecord): AccountProfile {
  return {
    id: record.id,
    fullName: record.fullName,
    email: record.email,
    role: record.role,
  };
}

function toNotificationPreferences(record: UserRecord): NotificationPreferences {
  return {
    notifyByEmail: record.notifyByEmail,
    notifyPayments: record.notifyPayments,
    notifyMaintenance: record.notifyMaintenance,
    notifyMessages: record.notifyMessages,
    notifyAnnouncements: record.notifyAnnouncements,
  };
}

function toOrganizationProfile(record: OrgRecord): OrganizationProfile {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    subscriptionTier: record.subscriptionTier,
    contactEmail: record.contactEmail,
    contactPhone: record.contactPhone,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    state: record.state,
    postalCode: record.postalCode,
    websiteUrl: record.websiteUrl,
  };
}
