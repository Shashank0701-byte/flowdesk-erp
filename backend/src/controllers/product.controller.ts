import { Request, Response } from 'express';
import { z } from 'zod';
import { StockMovementType } from '@prisma/client';
import { prisma } from '../utils/prisma';

// ─── Validation schemas ───────────────────────────────────────────────────────

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
  currentStock: z.coerce.number().int().min(0).default(0),
  minStockAlert: z.coerce.number().int().min(0).default(0),
  location: z.string().optional(),
});

const updateProductSchema = createProductSchema
  .omit({ sku: true, currentStock: true }) // SKU is immutable; stock changes only via /stock
  .partial();

const stockAdjustSchema = z.object({
  type: z.nativeEnum(StockMovementType),
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
  reason: z.string().min(1, 'Reason is required'),
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  lowStock: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const stockHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function listProducts(req: Request, res: Response): Promise<void> {
  const result = listQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { q, category, lowStock, page, limit } = result.data;
  const skip = (page - 1) * limit;

  const baseWhere = {
    ...(category && { category: { equals: category, mode: 'insensitive' as const } }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { sku: { contains: q, mode: 'insensitive' as const } },
        { category: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
  };

  // Prisma can't compare two columns in a where clause, so lowStock
  // is resolved post-query from a full fetch, then paginated manually.
  if (lowStock) {
    const all = await prisma.product.findMany({
      where: baseWhere,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, sku: true, category: true,
        unitPrice: true, currentStock: true, minStockAlert: true,
        location: true, createdAt: true,
      },
    });

    const filtered = all.filter((p) => p.currentStock <= p.minStockAlert);
    const total = filtered.length;
    const pageData = filtered.slice(skip, skip + limit);

    res.json({ data: pageData, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    return;
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, name: true, sku: true, category: true,
        unitPrice: true, currentStock: true, minStockAlert: true,
        location: true, createdAt: true,
      },
    }),
    prisma.product.count({ where: baseWhere }),
  ]);

  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      _count: { select: { stockMovements: true, challanItems: true } },
    },
  });

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json({ data: product });
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const result = createProductSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const skuExists = await prisma.product.findUnique({ where: { sku: result.data.sku } });
  if (skuExists) {
    res.status(409).json({ error: `SKU "${result.data.sku}" is already in use` });
    return;
  }

  const { currentStock, ...rest } = result.data;

  // Create product + optional opening stock movement in one transaction
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data: { ...rest, currentStock } });

    if (currentStock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: created.id,
          quantityChanged: currentStock,
          type: StockMovementType.IN,
          reason: 'Opening stock',
          createdById: req.user!.userId,
        },
      });
    }

    return created;
  });

  res.status(201).json({ data: product });
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const result = updateProductSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const existing = await prisma.product.findUnique({ where: { id: (req.params.id as string) } });
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const product = await prisma.product.update({
    where: { id: (req.params.id as string) },
    data: result.data,
  });

  res.json({ data: product });
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id: (req.params.id as string) } });
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const challanCount = await prisma.challanItem.count({ where: { productId: (req.params.id as string) } });
  if (challanCount > 0) {
    res.status(409).json({
      error: `Cannot delete product referenced in ${challanCount} challan item(s)`,
    });
    return;
  }

  await prisma.product.delete({ where: { id: (req.params.id as string) } });
  res.status(204).send();
}

export async function adjustStock(req: Request, res: Response): Promise<void> {
  const result = stockAdjustSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { type, quantity, reason } = result.data;

  // Return a discriminated union from the transaction instead of throwing —
  // avoids Express 4 async error propagation issues.
  type TxResult =
    | { ok: true; product: Awaited<ReturnType<typeof prisma.product.update>> }
    | { ok: false; status: 404 | 422; error: string };

  const txResult: TxResult = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: (req.params.id as string) } });

    if (!product) return { ok: false, status: 404 as const, error: 'Product not found' };

    if (type === StockMovementType.OUT && product.currentStock < quantity) {
      return {
        ok: false,
        status: 422 as const,
        error: `Insufficient stock. Available: ${product.currentStock}, requested: ${quantity}`,
      };
    }

    const newStock =
      type === StockMovementType.IN
        ? product.currentStock + quantity
        : product.currentStock - quantity;

    const [updatedProduct] = await Promise.all([
      tx.product.update({ where: { id: (req.params.id as string) }, data: { currentStock: newStock } }),
      tx.stockMovement.create({
        data: {
          productId: (req.params.id as string),
          quantityChanged: quantity,
          type,
          reason,
          createdById: req.user!.userId,
        },
      }),
    ]);

    return { ok: true, product: updatedProduct };
  });

  if (!txResult.ok) {
    res.status(txResult.status).json({ error: txResult.error });
    return;
  }

  res.json({ data: txResult.product });
}

export async function listStockMovements(req: Request, res: Response): Promise<void> {
  const result = stockHistoryQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { page, limit } = result.data;
  const skip = (page - 1) * limit;

  const product = await prisma.product.findUnique({ where: { id: (req.params.id as string) } });
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId: (req.params.id as string) },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { createdBy: { select: { id: true, name: true, role: true } } },
    }),
    prisma.stockMovement.count({ where: { productId: (req.params.id as string) } }),
  ]);

  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}
