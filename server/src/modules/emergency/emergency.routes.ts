import { Router } from 'express';

import { authorize, authenticate } from '../../middleware/auth.js';
import {
  assignRequest,
  createRequest,
  getOperationalSummary,
  getPriorityQueue,
  getMyRequests,
  getRequestById,
  listRequests,
  unassignRequest,
  updateRequestStatus,
} from './emergency.controller.js';

export const emergencyRouter = Router();

emergencyRouter.post('/', authenticate, createRequest);
emergencyRouter.get('/me', authenticate, getMyRequests);
emergencyRouter.get('/', authenticate, authorize('COORDINATOR', 'RESPONDER', 'ADMIN'), listRequests);
emergencyRouter.get('/stats/summary', authenticate, authorize('COORDINATOR', 'ADMIN'), getOperationalSummary);
emergencyRouter.get('/priority', authenticate, authorize('COORDINATOR', 'ADMIN'), getPriorityQueue);
emergencyRouter.get('/:id', authenticate, getRequestById);
emergencyRouter.patch('/:id/status', authenticate, authorize('COORDINATOR', 'RESPONDER', 'ADMIN'), updateRequestStatus);
emergencyRouter.patch('/:id/assign', authenticate, authorize('COORDINATOR', 'ADMIN'), assignRequest);
emergencyRouter.patch('/:id/unassign', authenticate, authorize('COORDINATOR', 'ADMIN'), unassignRequest);
