import { Router } from 'express';

import { authenticate, authorize } from '../../middleware/auth.js';
import {
  cancelAllocationRequest,
  getAllocationHistory,
  releaseAllocationRequest,
} from './resource-allocation.controller.js';

export const resourceAllocationRouter = Router();

resourceAllocationRouter.patch('/:id/release', authenticate, authorize('COORDINATOR', 'ADMIN'), releaseAllocationRequest);
resourceAllocationRouter.patch('/:id/cancel', authenticate, authorize('COORDINATOR', 'ADMIN'), cancelAllocationRequest);
resourceAllocationRouter.get('/', authenticate, authorize('COORDINATOR', 'ADMIN'), getAllocationHistory);
