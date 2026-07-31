// Seeds a demo organization with one user per role plus a small property
// portfolio, so you can log in as each role and see how access differs.
// Run: pnpm --filter @propertyflow/database db:seed
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'Password123';

const USERS = [
  ['orgadmin@demo.test', 'Olivia Admin', 'ORG_ADMIN', true],
  ['manager@demo.test', 'Mia Manager', 'PROPERTY_MANAGER', true],
  ['maintenance@demo.test', 'Marco Maintenance', 'MAINTENANCE', true],
  ['owner@demo.test', 'Nora Owner', 'OWNER', true],
  ['tenant@demo.test', 'Theo Tenant', 'TENANT', true],
];

// [label, bedrooms, bathrooms, squareFeet, marketRentCents, status]
const PORTFOLIO = [
  {
    name: 'Maple Court',
    type: 'APARTMENT',
    addressLine1: '120 Maple Street',
    city: 'Portland',
    state: 'OR',
    postalCode: '97205',
    yearBuilt: 2016,
    notes: 'Elevator building with covered parking and on-site laundry.',
    imageUrl:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    ownerEmail: 'owner@demo.test',
    units: [
      ['1A', 1, 1, 620, 145000, 'OCCUPIED'],
      ['1B', 2, 1, 880, 189500, 'OCCUPIED'],
      ['2A', 2, 2, 940, 205000, 'VACANT'],
      ['2B', 3, 2, 1180, 249000, 'MAINTENANCE'],
    ],
  },
  {
    name: 'Cedar Row Townhomes',
    type: 'TOWNHOUSE',
    addressLine1: '44 Cedar Row',
    city: 'Beaverton',
    state: 'OR',
    postalCode: '97005',
    yearBuilt: 2009,
    imageUrl:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
    ownerEmail: 'owner@demo.test',
    units: [
      ['A', 3, 2.5, 1450, 269000, 'OCCUPIED'],
      ['B', 3, 2.5, 1450, 269000, 'VACANT'],
    ],
  },
  {
    name: 'Harborview Lofts',
    type: 'MULTI_FAMILY',
    addressLine1: '8 Harbor Way',
    city: 'Astoria',
    state: 'OR',
    postalCode: '97103',
    imageUrl:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    // Deliberately unassigned, so the OWNER role cannot see it.
    ownerEmail: null,
    units: [
      ['101', 1, 1, 700, 158000, 'OCCUPIED'],
      ['102', 1, 1, 700, 158000, 'OCCUPIED'],
      ['201', 2, 2, 1020, 224000, 'VACANT'],
    ],
  },
];

async function seedPortfolio(organizationId, usersByEmail) {
  let created = 0;

  for (const property of PORTFOLIO) {
    const existing = await prisma.property.findFirst({
      where: { organizationId, name: property.name },
      select: { id: true },
    });
    if (existing) continue;

    const { units, ownerEmail, ...fields } = property;
    await prisma.property.create({
      data: {
        ...fields,
        organizationId,
        ownerId: ownerEmail ? usersByEmail.get(ownerEmail).id : null,
        units: {
          create: units.map(([label, bedrooms, bathrooms, squareFeet, marketRentCents, status]) => ({
            label,
            bedrooms,
            bathrooms,
            squareFeet,
            marketRentCents,
            status,
          })),
        },
      },
    });
    created += 1;
  }

  return created;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Puts the demo tenant on an active lease so the leases page has live data. */
async function seedLeases(organizationId, usersByEmail) {
  const tenant = usersByEmail.get('tenant@demo.test');
  if (!tenant) return 0;

  const existing = await prisma.lease.findFirst({
    where: { organizationId, tenantId: tenant.id },
    select: { id: true },
  });
  if (existing) return 0;

  // Lease the first occupied unit of Maple Court to the demo tenant.
  const unit = await prisma.unit.findFirst({
    where: { property: { organizationId, name: 'Maple Court' }, status: 'OCCUPIED' },
    orderBy: { label: 'asc' },
    select: { id: true, marketRentCents: true },
  });
  if (!unit) return 0;

  const start = new Date();
  await prisma.lease.create({
    data: {
      organizationId,
      unitId: unit.id,
      tenantId: tenant.id,
      status: 'ACTIVE',
      startDate: start,
      endDate: addMonths(start, 12),
      rentCents: unit.marketRentCents,
      depositCents: unit.marketRentCents,
      notes: 'Standard 12-month residential lease.',
    },
  });

  return 1;
}

/** Adds a small rent ledger for the tenant portal and accounting workspace. */
async function seedPayments(organizationId, usersByEmail) {
  const tenant = usersByEmail.get('tenant@demo.test');
  if (!tenant) return 0;

  const lease = await prisma.lease.findFirst({
    where: { organizationId, tenantId: tenant.id },
    select: {
      id: true,
      rentCents: true,
      unit: { select: { property: { select: { ownerId: true } } } },
    },
  });
  if (!lease) return 0;

  const existing = await prisma.payment.count({ where: { leaseId: lease.id } });
  if (existing) return 0;

  const now = new Date();
  const payments = [];
  for (let offset = -3; offset <= 1; offset += 1) {
    const dueDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const isPast = offset <= 0;
    payments.push({
      organizationId,
      leaseId: lease.id,
      tenantId: tenant.id,
      ownerId: lease.unit.property.ownerId,
      status: isPast ? 'PAID' : 'PENDING',
      amountCents: lease.rentCents,
      dueDate,
      paidAt: isPast ? new Date(dueDate.getFullYear(), dueDate.getMonth(), 1) : null,
      description: `Rent · ${dueDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
      method: isPast ? 'ACH' : null,
      reference: isPast ? `DEMO-${dueDate.getFullYear()}-${dueDate.getMonth() + 1}` : null,
    });
  }

  await prisma.payment.createMany({ data: payments });
  return payments.length;
}

async function seedMaintenance(organizationId, usersByEmail) {
  const tenant = usersByEmail.get('tenant@demo.test');
  const technician = usersByEmail.get('maintenance@demo.test');
  if (!tenant || !technician) return 0;
  const lease = await prisma.lease.findFirst({
    where: { organizationId, tenantId: tenant.id },
    select: {
      id: true,
      unitId: true,
      unit: { select: { property: { select: { ownerId: true } } } },
    },
  });
  if (!lease) return 0;
  if (await prisma.maintenanceRequest.count({ where: { organizationId } })) return 0;

  await prisma.maintenanceRequest.create({
    data: {
      organizationId,
      leaseId: lease.id,
      unitId: lease.unitId,
      tenantId: tenant.id,
      ownerId: lease.unit.property.ownerId,
      title: 'Kitchen faucet is leaking',
      description: 'The kitchen faucet has a steady drip and water is collecting below the sink.',
      priority: 'HIGH',
    },
  });
  const assigned = await prisma.maintenanceRequest.create({
    data: {
      organizationId,
      leaseId: lease.id,
      unitId: lease.unitId,
      tenantId: tenant.id,
      ownerId: lease.unit.property.ownerId,
      assigneeId: technician.id,
      title: 'HVAC is not cooling',
      description: 'The system is running but the apartment remains above the thermostat setting.',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
    },
  });
  await prisma.workOrder.create({
    data: {
      organizationId,
      maintenanceRequestId: assigned.id,
      assigneeId: technician.id,
      tenantId: tenant.id,
      ownerId: lease.unit.property.ownerId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      dueDate: new Date(),
      referenceCode: 'WO-DEMO-01',
      notes: 'Inspect condenser and thermostat.',
    },
  });
  return 2;
}

async function seedConversations(organizationId, usersByEmail) {
  const tenant = usersByEmail.get('tenant@demo.test');
  const admin = usersByEmail.get('orgadmin@demo.test');
  if (!tenant || !admin) return 0;
  if (await prisma.conversation.count({ where: { organizationId } })) return 0;

  const base = new Date();
  const conversation = await prisma.conversation.create({
    data: {
      organizationId,
      subject: 'Lease renewal options',
      participantIds: [tenant.id],
      lastMessageAt: base,
      messages: {
        create: [
          {
            organizationId,
            senderId: tenant.id,
            body: 'Hi! My lease ends soon — what are my renewal options?',
            createdAt: new Date(base.getTime() - 1000 * 60 * 60),
          },
          {
            organizationId,
            senderId: admin.id,
            body: 'Happy to help. We can offer a 12-month renewal at the current rate. Want me to send the paperwork?',
            createdAt: base,
          },
        ],
      },
    },
  });
  return conversation ? 1 : 0;
}

async function seedApplications(organizationId) {
  if (await prisma.application.count({ where: { organizationId } })) return 0;
  const units = await prisma.unit.findMany({
    where: { property: { organizationId }, status: 'VACANT' },
    take: 2,
    select: { id: true },
  });
  if (!units.length) return 0;
  const rows = [
    ['Olivia Martin', 'olivia.applicant@example.com', 'NEW'],
    ['Noah Williams', 'noah.applicant@example.com', 'SCREENING'],
    ['Emma Davis', 'emma.applicant@example.com', 'APPROVED'],
  ].map(([applicantName, applicantEmail, status], index) => ({
    organizationId,
    unitId: units[index % units.length].id,
    applicantName,
    applicantEmail,
    status,
    monthlyIncomeCents: 650000 + index * 75000,
    desiredMoveIn: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
  }));
  await prisma.application.createMany({ data: rows });
  return rows.length;
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-realty' },
    update: {},
    create: { name: 'Demo Realty', slug: 'demo-realty', subscriptionTier: 'GROWTH' },
  });

  const usersByEmail = new Map();
  for (const [email, fullName, role, inOrg] of USERS) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { role, fullName, organizationId: inOrg ? org.id : null },
      create: {
        email,
        fullName,
        role,
        organizationId: inOrg ? org.id : null,
        passwordHash,
      },
    });
    usersByEmail.set(email, user);
  }

  const createdProperties = await seedPortfolio(org.id, usersByEmail);
  const createdLeases = await seedLeases(org.id, usersByEmail);
  const createdPayments = await seedPayments(org.id, usersByEmail);
  const createdMaintenance = await seedMaintenance(org.id, usersByEmail);
  const createdApplications = await seedApplications(org.id);
  const createdConversations = await seedConversations(org.id, usersByEmail);

  console.log(`\nSeeded organization "${org.name}" and ${USERS.length} users.`);
  console.log(
    createdProperties
      ? `Added ${createdProperties} propert${createdProperties === 1 ? 'y' : 'ies'}.`
      : 'Portfolio already present, left unchanged.',
  );
  console.log(
    createdApplications ? `Added ${createdApplications} applications.` : 'Applications already present.',
  );
  console.log(createdLeases ? `Added ${createdLeases} lease.` : 'Leases already present.');
  console.log(createdPayments ? `Added ${createdPayments} payments.` : 'Payments already present.');
  console.log(
    createdMaintenance
      ? `Added ${createdMaintenance} maintenance requests.`
      : 'Maintenance requests already present.',
  );
  console.log(
    createdConversations ? `Added ${createdConversations} conversation.` : 'Conversations already present.',
  );
  console.log(`Password for every seeded user: ${PASSWORD}\n`);
  for (const [email, , role] of USERS) console.log(`  ${role.padEnd(18)} ${email}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
