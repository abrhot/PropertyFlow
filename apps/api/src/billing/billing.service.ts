import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_TIER_PRICE_CENTS,
  type SubscriptionTier,
} from '@propertyflow/constants';
import type { BillingOverviewResponse, RequestUser } from '@propertyflow/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: RequestUser): Promise<BillingOverviewResponse> {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only platform administrators can view billing');
    }
    const organizations = await this.prisma.client.organization.findMany({
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const subscriptions = organizations.map((org) => ({
      organizationId: org.id,
      organizationName: org.name,
      subscriptionTier: org.subscriptionTier,
      isActive: org.isActive,
      monthlyPriceCents: org.isActive ? SUBSCRIPTION_TIER_PRICE_CENTS[org.subscriptionTier] : 0,
      userCount: org._count.users,
      since: org.createdAt.toISOString(),
    }));

    const byTier = SUBSCRIPTION_TIERS.map((tier: SubscriptionTier) => {
      const inTier = subscriptions.filter((sub) => sub.subscriptionTier === tier);
      return {
        tier,
        organizationCount: inTier.length,
        monthlyRevenueCents: inTier.reduce((sum, sub) => sum + sub.monthlyPriceCents, 0),
      };
    });

    const active = subscriptions.filter((sub) => sub.isActive);
    return {
      summary: {
        mrrCents: subscriptions.reduce((sum, sub) => sum + sub.monthlyPriceCents, 0),
        activeSubscriptions: active.length,
        trialCount: subscriptions.filter((sub) => sub.subscriptionTier === 'TRIAL').length,
        payingCount: active.filter((sub) => sub.subscriptionTier !== 'TRIAL').length,
      },
      byTier,
      subscriptions,
    };
  }
}
