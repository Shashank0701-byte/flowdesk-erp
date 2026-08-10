import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_USERS = [
  { name: 'Admin User',     email: 'admin@erp.com',     password: 'admin123',     role: Role.Admin },
  { name: 'Sales User',     email: 'sales@erp.com',     password: 'sales123',     role: Role.Sales },
  { name: 'Warehouse User', email: 'warehouse@erp.com', password: 'warehouse123', role: Role.Warehouse },
  { name: 'Accounts User',  email: 'accounts@erp.com',  password: 'accounts123',  role: Role.Accounts },
];

async function main() {
  console.log('Seeding database...\n');

  // Ensure ChallanSequence row exists (used for race-safe challan number generation)
  await prisma.challanSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastValue: 0 },
  });
  console.log('ChallanSequence initialized');

  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
    console.log(`  [${u.role}]  ${u.email}  /  ${u.password}`);
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
