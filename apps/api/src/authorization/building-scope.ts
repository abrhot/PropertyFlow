import type { Prisma } from '@propertyflow/database';
import type { RequestUser } from '@propertyflow/types';

/**
 * Building-level scoping for property managers.
 *
 * A PROPERTY_MANAGER only runs the buildings assigned to them, so on top of the
 * organization-wide CASL rules the services apply an extra "these buildings only"
 * filter. Every other role is already scoped by CASL (admins see the whole org,
 * owners their owned properties, tenants/maintenance their own records), so this
 * layer does not restrict them further.
 *
 * The returned per-entity fragments are Prisma `where` inputs that can be AND-ed
 * into any query. For unrestricted callers each fragment is an empty object
 * (`{}`), a harmless no-op inside an `AND`.
 */

/** The caller's managed building ids, or `null` meaning "no building limit". */
export function managedPropertyIds(user: RequestUser): string[] | null {
  if (user.role !== 'PROPERTY_MANAGER') return null;
  return user.managedPropertyIds ?? [];
}

/** True when the caller may act on the given building. */
export function managesProperty(user: RequestUser, propertyId: string): boolean {
  const ids = managedPropertyIds(user);
  return ids === null || ids.includes(propertyId);
}

export interface BuildingScope {
  /** True only for a building-scoped property manager. */
  restricted: boolean;
  ids: string[];
  property: Prisma.PropertyWhereInput;
  unit: Prisma.UnitWhereInput;
  lease: Prisma.LeaseWhereInput;
  payment: Prisma.PaymentWhereInput;
  maintenanceRequest: Prisma.MaintenanceRequestWhereInput;
  workOrder: Prisma.WorkOrderWhereInput;
  application: Prisma.ApplicationWhereInput;
  tenant: Prisma.UserWhereInput;
}

const UNRESTRICTED: BuildingScope = {
  restricted: false,
  ids: [],
  property: {},
  unit: {},
  lease: {},
  payment: {},
  maintenanceRequest: {},
  workOrder: {},
  application: {},
  tenant: {},
};

/** Per-entity building filters for the caller. */
export function buildingScope(user: RequestUser): BuildingScope {
  const ids = managedPropertyIds(user);
  if (ids === null) return UNRESTRICTED;

  const inIds = { in: ids };
  return {
    restricted: true,
    ids,
    property: { id: inIds },
    unit: { propertyId: inIds },
    lease: { unit: { propertyId: inIds } },
    payment: { lease: { unit: { propertyId: inIds } } },
    maintenanceRequest: { unit: { propertyId: inIds } },
    workOrder: { maintenanceRequest: { unit: { propertyId: inIds } } },
    application: { unit: { propertyId: inIds } },
    tenant: { leasesHeld: { some: { unit: { propertyId: inIds } } } },
  };
}
