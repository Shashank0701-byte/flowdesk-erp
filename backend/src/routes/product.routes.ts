import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';
import {
  adjustStock,
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  listStockMovements,
  updateProduct,
} from '../controllers/product.controller';

const router = Router();

router.use(authenticate);

// List & detail — all roles
router.get('/', asyncHandler(listProducts));
router.get('/:id', asyncHandler(getProduct));
router.get('/:id/stock', asyncHandler(listStockMovements));

// Create & update — Admin + Warehouse
router.post('/', authorize(Role.Admin, Role.Warehouse), asyncHandler(createProduct));
router.put('/:id', authorize(Role.Admin, Role.Warehouse), asyncHandler(updateProduct));

// Stock adjustment — Admin + Warehouse
router.post('/:id/stock', authorize(Role.Admin, Role.Warehouse), asyncHandler(adjustStock));

// Delete — Admin only
router.delete('/:id', authorize(Role.Admin), asyncHandler(deleteProduct));

export default router;
