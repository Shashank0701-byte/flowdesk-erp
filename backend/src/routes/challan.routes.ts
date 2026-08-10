import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
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
router.get('/', listChallans);
router.get('/:id', getChallan);

// Create & update Draft — Admin + Sales
router.post('/', authorize(Role.Admin, Role.Sales), createChallan);
router.put('/:id', authorize(Role.Admin, Role.Sales), updateChallan);

// State transitions — Admin + Sales
router.post('/:id/confirm', authorize(Role.Admin, Role.Sales), confirmChallan);
router.post('/:id/cancel', authorize(Role.Admin, Role.Sales), cancelChallan);

export default router;
