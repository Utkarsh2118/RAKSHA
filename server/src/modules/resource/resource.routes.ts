import { Router } from 'express';

import { authenticate, authorize } from '../../middleware/auth.js';
import {
  allocateResourceRequest,
  getResourceAllocationRecords,
} from '../resource-allocation/resource-allocation.controller.js';
import {
  createResourceRequest,
  deleteResourceRecord,
  adjustResourceStockRecord,
  getResourceRecord,
  getResourceAlertsRecord,
  getResourceAvailabilityRecord,
  getInventorySummaryRecord,
  listLowStockResourceRecords,
  listResourceRecords,
  updateResourceStockRecord,
  updateResourceRecord,
} from './resource.controller.js';

export const resourceRouter = Router();

resourceRouter.post('/', authenticate, authorize('COORDINATOR', 'ADMIN'), createResourceRequest);
resourceRouter.get('/', authenticate, authorize('COORDINATOR', 'ADMIN', 'RESPONDER'), listResourceRecords);
resourceRouter.get('/availability', authenticate, authorize('COORDINATOR', 'ADMIN', 'RESPONDER'), getResourceAvailabilityRecord);
resourceRouter.get('/inventory/summary', authenticate, authorize('COORDINATOR', 'ADMIN', 'RESPONDER'), getInventorySummaryRecord);
resourceRouter.get('/inventory/low-stock', authenticate, authorize('COORDINATOR', 'ADMIN', 'RESPONDER'), listLowStockResourceRecords);
resourceRouter.get('/alerts', authenticate, authorize('COORDINATOR', 'ADMIN'), getResourceAlertsRecord);
resourceRouter.patch('/:id/stock', authenticate, authorize('COORDINATOR', 'ADMIN'), updateResourceStockRecord);
resourceRouter.patch('/:id/stock/adjust', authenticate, authorize('COORDINATOR', 'ADMIN'), adjustResourceStockRecord);
resourceRouter.post('/:resourceId/allocate', authenticate, authorize('COORDINATOR', 'ADMIN'), allocateResourceRequest);
resourceRouter.get('/:resourceId/allocations', authenticate, authorize('COORDINATOR', 'ADMIN', 'RESPONDER'), getResourceAllocationRecords);
resourceRouter.get('/:id', authenticate, authorize('COORDINATOR', 'ADMIN', 'RESPONDER'), getResourceRecord);
resourceRouter.patch('/:id', authenticate, authorize('COORDINATOR', 'ADMIN'), updateResourceRecord);
resourceRouter.delete('/:id', authenticate, authorize('ADMIN'), deleteResourceRecord);
