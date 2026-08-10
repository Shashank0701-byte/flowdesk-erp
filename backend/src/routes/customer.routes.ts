import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
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
router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.get('/:id/notes', listNotes);

// Create & update — Admin + Sales
router.post('/', authorize(Role.Admin, Role.Sales), createCustomer);
router.put('/:id', authorize(Role.Admin, Role.Sales), updateCustomer);
router.post('/:id/notes', authorize(Role.Admin, Role.Sales), addNote);

// Delete — Admin only
router.delete('/:id', authorize(Role.Admin), deleteCustomer);

export default router;
