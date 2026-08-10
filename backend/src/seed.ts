import { PrismaClient, Role, CustomerStatus, CustomerType, ChallanStatus } from '@prisma/client';
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

  // ── ChallanSequence ───────────────────────────────────────────────────────────
  await prisma.challanSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastValue: 0 },
  });
  console.log('ChallanSequence initialized');

  // ── Users ─────────────────────────────────────────────────────────────────────
  const createdUsers: Record<string, string> = {};
  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
    createdUsers[u.role] = user.id;
    console.log(`  [${u.role}]  ${u.email}  /  ${u.password}`);
  }

  const adminId = createdUsers[Role.Admin];
  const salesId = createdUsers[Role.Sales];

  // ── Customers ─────────────────────────────────────────────────────────────────
  console.log('\nSeeding customers...');
  const customerData = [
    {
      name: 'Rajesh Sharma',
      mobile: '9876543210',
      email: 'rajesh@sharma.in',
      businessName: 'Sharma Traders',
      gstNumber: '27AAPFU0939F1ZV',
      type: CustomerType.Wholesale,
      status: CustomerStatus.Active,
      address: '14, MG Road, Mumbai, Maharashtra',
    },
    {
      name: 'Priya Mehta',
      mobile: '9823456781',
      email: 'priya@mehtaenterprises.com',
      businessName: 'Mehta Enterprises',
      gstNumber: '29AABCU9603R1ZX',
      type: CustomerType.Distributor,
      status: CustomerStatus.Active,
      address: '8, Brigade Road, Bengaluru, Karnataka',
    },
    {
      name: 'Ankit Gupta',
      mobile: '9712345678',
      email: null,
      businessName: null,
      gstNumber: null,
      type: CustomerType.Retail,
      status: CustomerStatus.Active,
      address: 'Shop 3, Lajpat Nagar, New Delhi',
    },
    {
      name: 'Sunita Patel',
      mobile: '9654321098',
      email: 'sunita@patelco.in',
      businessName: 'Patel & Co.',
      gstNumber: '24AAACR5055K1ZK',
      type: CustomerType.Wholesale,
      status: CustomerStatus.Inactive,
      address: '22, Ring Road, Ahmedabad, Gujarat',
    },
    {
      name: 'Vikram Nair',
      mobile: '9543210987',
      email: 'vikram@nairsupplies.com',
      businessName: 'Nair Supplies',
      gstNumber: null,
      type: CustomerType.Retail,
      status: CustomerStatus.Active,
      address: '5, MG Road, Kochi, Kerala',
    },
  ];

  const customers: { id: string; name: string }[] = [];
  for (const c of customerData) {
    const existing = await prisma.customer.findFirst({ where: { mobile: c.mobile } });
    if (existing) {
      customers.push(existing);
      console.log(`  [skip] ${c.name}`);
      continue;
    }
    const customer = await prisma.customer.create({ data: c });
    customers.push(customer);
    console.log(`  [+] ${c.name}`);
  }

  // ── Products ──────────────────────────────────────────────────────────────────
  console.log('\nSeeding products...');
  const productData = [
    { name: 'M6 Hex Bolt (SS)',  sku: 'BOLT-M6-SS',   category: 'Fasteners',    unitPrice: 2.50,   currentStock: 1500, minStockAlert: 200, location: 'Rack A1' },
    { name: 'M8 Hex Bolt (MS)',  sku: 'BOLT-M8-MS',   category: 'Fasteners',    unitPrice: 3.00,   currentStock: 800,  minStockAlert: 100, location: 'Rack A2' },
    { name: 'M6 Nut (SS)',       sku: 'NUT-M6-SS',    category: 'Fasteners',    unitPrice: 1.20,   currentStock: 40,   minStockAlert: 200, location: 'Rack A3' },
    { name: 'Arduino Uno R3',    sku: 'ELEC-ARD-UNO', category: 'Electronics',  unitPrice: 450.00, currentStock: 25,   minStockAlert: 5,   location: 'Shelf B1' },
    { name: 'Bubble Wrap Roll',  sku: 'PKG-BW-50M',   category: 'Packaging',    unitPrice: 180.00, currentStock: 12,   minStockAlert: 15,  location: 'Bay C1' },
    { name: 'HDPE Granules 1kg', sku: 'RAW-HDPE-1K',  category: 'Raw Material', unitPrice: 95.00,  currentStock: 300,  minStockAlert: 50,  location: 'Bay D2' },
    { name: 'Vernier Caliper',   sku: 'TOOL-VC-150',  category: 'Tools',        unitPrice: 320.00, currentStock: 8,    minStockAlert: 3,   location: 'Shelf B2' },
  ];

  const products: { id: string; name: string; sku: string; unitPrice: number }[] = [];
  for (const p of productData) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (existing) {
      products.push({ ...existing, unitPrice: Number(existing.unitPrice) });
      console.log(`  [skip] ${p.name}`);
      continue;
    }
    const product = await prisma.product.create({ data: p });
    // Record opening stock movement
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: 'IN',
        quantityChanged: p.currentStock,
        reason: 'Opening stock',
        createdById: adminId,
      },
    });
    products.push({ ...product, unitPrice: Number(product.unitPrice) });
    console.log(`  [+] ${p.name}  (stock: ${p.currentStock})`);
  }

  // ── Sample Challans ───────────────────────────────────────────────────────────
  console.log('\nSeeding challans...');

  const existingChallans = await prisma.challan.count();
  if (existingChallans > 0) {
    console.log('  [skip] challans already exist');
  } else {
    // Helper: increment sequence and get next challan number
    const nextNumber = async () => {
      const seq = await prisma.challanSequence.update({
        where: { id: 1 },
        data: { lastValue: { increment: 1 } },
      });
      return `CH-${String(seq.lastValue).padStart(5, '0')}`;
    };

    // Challan 1 — Confirmed (Rajesh Sharma, 2 products)
    const challan1Number = await nextNumber();
    const c1Items = [
      { product: products[0], qty: 200 }, // M6 Hex Bolt
      { product: products[1], qty: 100 }, // M8 Hex Bolt
    ];
    const c1TotalQty = c1Items.reduce((s, i) => s + i.qty, 0);
    await prisma.challan.create({
      data: {
        challanNumber: challan1Number,
        status: ChallanStatus.Confirmed,
        customerId: customers[0].id,
        createdById: salesId,
        totalQuantity: c1TotalQty,
        items: {
          create: c1Items.map((i) => ({
            productId: i.product.id,
            productNameSnapshot: i.product.name,
            skuSnapshot: i.product.sku,
            unitPriceSnapshot: i.product.unitPrice,
            quantity: i.qty,
          })),
        },
      },
    });
    // Deduct stock
    for (const i of c1Items) {
      await prisma.product.update({
        where: { id: i.product.id },
        data: { currentStock: { decrement: i.qty } },
      });
      await prisma.stockMovement.create({
        data: {
          productId: i.product.id,
          type: 'OUT',
          quantityChanged: i.qty,
          reason: `Challan ${challan1Number}`,
          createdById: salesId,
        },
      });
    }
    console.log(`  [+] ${challan1Number} — Confirmed (${customers[0].name})`);

    // Challan 2 — Draft (Priya Mehta)
    const challan2Number = await nextNumber();
    const c2Items = [
      { product: products[3], qty: 5  }, // Arduino
      { product: products[6], qty: 2  }, // Vernier Caliper
    ];
    const c2TotalQty = c2Items.reduce((s, i) => s + i.qty, 0);
    await prisma.challan.create({
      data: {
        challanNumber: challan2Number,
        status: ChallanStatus.Draft,
        customerId: customers[1].id,
        createdById: salesId,
        totalQuantity: c2TotalQty,
        items: {
          create: c2Items.map((i) => ({
            productId: i.product.id,
            productNameSnapshot: i.product.name,
            skuSnapshot: i.product.sku,
            unitPriceSnapshot: i.product.unitPrice,
            quantity: i.qty,
          })),
        },
      },
    });
    console.log(`  [+] ${challan2Number} — Draft (${customers[1].name})`);

    // Challan 3 — Cancelled (Ankit Gupta)
    const challan3Number = await nextNumber();
    await prisma.challan.create({
      data: {
        challanNumber: challan3Number,
        status: ChallanStatus.Cancelled,
        customerId: customers[2].id,
        createdById: salesId,
        totalQuantity: 50,
        items: {
          create: [
            {
              productId: products[0].id,
              productNameSnapshot: products[0].name,
              skuSnapshot: products[0].sku,
              unitPriceSnapshot: products[0].unitPrice,
              quantity: 50,
            },
          ],
        },
      },
    });
    console.log(`  [+] ${challan3Number} — Cancelled (${customers[2].name})`);
  }

  console.log('\nDone. ✓');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
