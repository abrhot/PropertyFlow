// Seeds a demo organization with one user per role, so you can log in as each
// role and inspect the data in Prisma Studio.
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

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-realty' },
    update: {},
    create: { name: 'Demo Realty', slug: 'demo-realty', subscriptionTier: 'GROWTH' },
  });

  for (const [email, fullName, role, inOrg] of USERS) {
    await prisma.user.upsert({
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
  }

  console.log(`\nSeeded organization "${org.name}" and ${USERS.length} users.`);
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
