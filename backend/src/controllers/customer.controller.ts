import { Request, Response } from 'express';
import { z } from 'zod';
import { CustomerStatus, CustomerType } from '@prisma/client';
import { prisma } from '../utils/prisma';

// ─── Validation schemas ───────────────────────────────────────────────────────

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(7, 'Invalid mobile number'),
  email: z.string().email().optional().or(z.literal('')),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  type: z.nativeEnum(CustomerType),
  status: z.nativeEnum(CustomerStatus).optional(),
  address: z.string().optional(),
  followUpDate: z.string().datetime().optional().nullable(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const noteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty'),
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  type: z.nativeEnum(CustomerType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function listCustomers(req: Request, res: Response): Promise<void> {
  const result = listQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { q, status, type, page, limit } = result.data;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(type && { type }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { mobile: { contains: q, mode: 'insensitive' as const } },
        { businessName: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        businessName: true,
        type: true,
        status: true,
        followUpDate: true,
        createdAt: true,
      },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      _count: { select: { challans: true } },
    },
  });

  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  res.json({ data: customer });
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const result = createCustomerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { followUpDate, email, ...rest } = result.data;

  const customer = await prisma.customer.create({
    data: {
      ...rest,
      email: email || null,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    },
  });

  res.status(201).json({ data: customer });
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const result = updateCustomerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const { followUpDate, email, ...rest } = result.data;

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(email !== undefined && { email: email || null }),
      ...(followUpDate !== undefined && {
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      }),
    },
  });

  res.json({ data: customer });
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  // Block delete if customer has challans
  const challanCount = await prisma.challan.count({ where: { customerId: req.params.id } });
  if (challanCount > 0) {
    res.status(409).json({
      error: `Cannot delete customer with ${challanCount} associated challan(s)`,
    });
    return;
  }

  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

export async function addNote(req: Request, res: Response): Promise<void> {
  const result = noteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const note = await prisma.customerNote.create({
    data: {
      customerId: req.params.id,
      userId: req.user!.userId,
      note: result.data.note,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  res.status(201).json({ data: note });
}

export async function listNotes(req: Request, res: Response): Promise<void> {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const notes = await prisma.customerNote.findMany({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  res.json({ data: notes });
}
