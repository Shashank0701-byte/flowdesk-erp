import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';
import {
  addNote,
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  listNotes,
  updateCustomer,
} from '../controllers/customer.controller';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

// List & detail — all roles
router.get('/', asyncHandler(listCustomers));
router.get('/:id', asyncHandler(getCustomer));
router.get('/:id/notes', asyncHandler(listNotes));

// Create & update — Admin + Sales
router.post('/', authorize(Role.Admin, Role.Sales), asyncHandler(createCustomer));
router.put('/:id', authorize(Role.Admin, Role.Sales), asyncHandler(updateCustomer));
router.post('/:id/notes', authorize(Role.Admin, Role.Sales), asyncHandler(addNote));

// Delete — Admin only
router.delete('/:id', authorize(Role.Admin), asyncHandler(deleteCustomer));

export default router;
