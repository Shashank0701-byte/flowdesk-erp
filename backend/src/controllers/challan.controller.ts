import { Request, Response } from 'express';
import { z } from 'zod';
import { ChallanStatus, Prisma, StockMovementType } from '@prisma/client';
import { prisma } from '../utils/prisma';

// ─── Validation schemas ───────────────────────────────────────────────────────

const challanItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
});

const createChallanSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  items: z.array(challanItemSchema).min(1, 'At least one item is required'),
});

// Update allows swapping customer and replacing item list
const updateChallanSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(challanItemSchema).min(1, 'At least one item is required'),
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(ChallanStatus).optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Challan number generation ────────────────────────────────────────────────
// Runs inside the caller's transaction — incrementing ChallanSequence.lastValue
// is atomic, so concurrent creates cannot produce duplicate numbers.

async function generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const seq = await tx.challanSequence.update({
    where: { id: 1 },
    data: { lastValue: { increment: 1 } },
  });
  const year = new Date().getFullYear();
  return `CH-${year}-${String(seq.lastValue).padStart(4, '0')}`;
}

// ─── Shared helper: fetch + validate products for item list ───────────────────

async function resolveProducts(productIds: string[]) {
  // Guard: duplicate product IDs in one challan would create two line items
  // for the same product — almost always a client mistake.
  const seen = new Set<string>();
  const duplicates = productIds.filter((id) => (seen.has(id) ? true : !seen.add(id)));
  if (duplicates.length > 0) {
    return { error: `Duplicate product IDs in items: ${[...new Set(duplicates)].join(', ')}`, products: null };
  }

  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    const missing = productIds.filter((id) => !products.find((p) => p.id === id));
    return { error: `Products not found: ${missing.join(', ')}`, products: null };
  }
  return { error: null, products };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function listChallans(req: Request, res: Response): Promise<void> {
  const result = listQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { q, status, customerId, page, limit } = result.data;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(customerId && { customerId }),
    ...(q && { challanNumber: { contains: q, mode: 'insensitive' as const } }),
  };

  const [data, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, businessName: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.challan.count({ where }),
  ]);

  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}

export async function getChallan(req: Request, res: Response): Promise<void> {
  const challan = await prisma.challan.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, role: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, currentStock: true } },
        },
      },
    },
  });

  if (!challan) {
    res.status(404).json({ error: 'Challan not found' });
    return;
  }

  res.json({ data: challan });
}

export async function createChallan(req: Request, res: Response): Promise<void> {
  const result = createChallanSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { customerId, items } = result.data;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const { error, products } = await resolveProducts(items.map((i) => i.productId));
  if (error || !products) {
    res.status(404).json({ error });
    return;
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  const challan = await prisma.$transaction(async (tx) => {
    const challanNumber = await generateChallanNumber(tx);

    return tx.challan.create({
      data: {
        challanNumber,
        customerId,
        status: ChallanStatus.Draft,
        totalQuantity,
        createdById: req.user!.userId,
        items: {
          create: items.map((item) => {
            const p = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              productNameSnapshot: p.name,
              skuSnapshot: p.sku,
              unitPriceSnapshot: p.unitPrice,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
      },
    });
  });

  res.status(201).json({ data: challan });
}

export async function updateChallan(req: Request, res: Response): Promise<void> {
  const result = updateChallanSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const existing = await prisma.challan.findUnique({ where: { id: (req.params.id as string) } });
  if (!existing) {
    res.status(404).json({ error: 'Challan not found' });
    return;
  }
  if (existing.status !== ChallanStatus.Draft) {
    res.status(409).json({ error: `Cannot edit a challan with status "${existing.status}"` });
    return;
  }

  const { customerId, items } = result.data;

  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
  }

  const { error, products } = await resolveProducts(items.map((i) => i.productId));
  if (error || !products) {
    res.status(404).json({ error });
    return;
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  const challan = await prisma.$transaction(async (tx) => {
    // Replace all items atomically with fresh snapshots
    await tx.challanItem.deleteMany({ where: { challanId: (req.params.id as string) } });

    return tx.challan.update({
      where: { id: (req.params.id as string) },
      data: {
        ...(customerId && { customerId }),
        totalQuantity,
        items: {
          create: items.map((item) => {
            const p = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              productNameSnapshot: p.name,
              skuSnapshot: p.sku,
              unitPriceSnapshot: p.unitPrice,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });
  });

  res.json({ data: challan });
}

export async function confirmChallan(req: Request, res: Response): Promise<void> {
  // ─── THE CRITICAL TRANSACTION ──────────────────────────────────────────────
  // Stock re-check AND decrement are a single atomic operation.
  // If any product has insufficient stock, the whole transaction rolls back.
  // Uses the discriminated-union return pattern (no throwing inside async handler).

  type TxResult =
    | { ok: true; challan: Awaited<ReturnType<typeof prisma.challan.update>> }
    | { ok: false; status: 404 | 409; error: string };

  const txResult: TxResult = await prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({
      where: { id: (req.params.id as string) },
      include: { items: true },
    });

    if (!challan) {
      return { ok: false, status: 404 as const, error: 'Challan not found' };
    }

    if (challan.status !== ChallanStatus.Draft) {
      return {
        ok: false,
        status: 409 as const,
        error: `Challan is already "${challan.status}" — only Draft challans can be confirmed`,
      };
    }

    // ── Step 1: Re-check stock for every line item ─────────────────────────
    // We re-fetch inside the transaction for a consistent, locked view.
    for (const item of challan.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });

      if (!product) {
        return {
          ok: false,
          status: 409 as const,
          error: `Product "${item.productNameSnapshot}" (${item.skuSnapshot}) no longer exists`,
        };
      }

      if (product.currentStock < item.quantity) {
        return {
          ok: false,
          status: 409 as const,
          error:
            `Insufficient stock for "${product.name}" (${product.sku}). ` +
            `Available: ${product.currentStock}, required: ${item.quantity}`,
        };
      }
    }

    // ── Step 2: Decrement stock + write StockMovements ────────────────────
    await Promise.all([
      ...challan.items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        })
      ),
      ...challan.items.map((item) =>
        tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            type: StockMovementType.OUT,
            reason: `Challan ${challan.challanNumber} confirmed`,
            createdById: req.user!.userId,
          },
        })
      ),
    ]);

    // ── Step 3: Mark Confirmed ─────────────────────────────────────────────
    const confirmed = await tx.challan.update({
      where: { id: (req.params.id as string) },
      data: { status: ChallanStatus.Confirmed },
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
      },
    });

    return { ok: true, challan: confirmed };
  });

  if (!txResult.ok) {
    res.status(txResult.status).json({ error: txResult.error });
    return;
  }

  res.json({ data: txResult.challan });
}

export async function cancelChallan(req: Request, res: Response): Promise<void> {
  const challan = await prisma.challan.findUnique({ where: { id: (req.params.id as string) } });

  if (!challan) {
    res.status(404).json({ error: 'Challan not found' });
    return;
  }

  if (challan.status === ChallanStatus.Cancelled) {
    res.status(409).json({ error: 'Challan is already cancelled' });
    return;
  }

  const updated = await prisma.challan.update({
    where: { id: (req.params.id as string) },
    data: { status: ChallanStatus.Cancelled },
    select: { id: true, challanNumber: true, status: true },
  });

  res.json({ data: updated });
}
