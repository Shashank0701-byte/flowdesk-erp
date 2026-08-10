import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';
import {
  cancelChallan,
  confirmChallan,
  createChallan,
  getChallan,
  listChallans,
  updateChallan,
} from '../controllers/challan.controller';

const router = Router();

router.use(authenticate);

// List & detail — all roles
router.get('/', asyncHandler(listChallans));
router.get('/:id', asyncHandler(getChallan));

// Create & update Draft — Admin + Sales
router.post('/', authorize(Role.Admin, Role.Sales), asyncHandler(createChallan));
router.put('/:id', authorize(Role.Admin, Role.Sales), asyncHandler(updateChallan));

// State transitions — Admin + Sales
router.patch('/:id/confirm', authorize(Role.Admin, Role.Sales), asyncHandler(confirmChallan));
router.patch('/:id/cancel', authorize(Role.Admin, Role.Sales), asyncHandler(cancelChallan));

export default router;
