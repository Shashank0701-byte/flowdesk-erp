import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
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
router.get('/', listProducts);
router.get('/:id', getProduct);
router.get('/:id/stock', listStockMovements);

// Create & update — Admin + Warehouse
router.post('/', authorize(Role.Admin, Role.Warehouse), createProduct);
router.put('/:id', authorize(Role.Admin, Role.Warehouse), updateProduct);

// Stock adjustment — Admin + Warehouse
router.post('/:id/stock', authorize(Role.Admin, Role.Warehouse), adjustStock);

// Delete — Admin only
router.delete('/:id', authorize(Role.Admin), deleteProduct);

export default router;
