// Seeds a demo organization with one user per role plus a small property
// portfolio, so you can log in as each role and see how access differs.
// Run: pnpm --filter @propertyflow/database db:seed
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'Password123';

const USERS = [
  ['superadmin@demo.test', 'Sam Super', 'SUPER_ADMIN', false],
  ['orgadmin@demo.test', 'Olivia Admin', 'ORG_ADMIN', true],
  ['manager@demo.test', 'Mia Manager', 'PROPERTY_MANAGER', true],
  ['agent@demo.test', 'Alex Agent', 'LEASING_AGENT', true],
  ['accountant@demo.test', 'Aria Accountant', 'ACCOUNTANT', true],
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

  console.log(`\nSeeded organization "${org.name}" and ${USERS.length} users.`);
  console.log(
    createdProperties
      ? `Added ${createdProperties} propert${createdProperties === 1 ? 'y' : 'ies'}.`
      : 'Portfolio already present, left unchanged.',
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
