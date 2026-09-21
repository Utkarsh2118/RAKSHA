import { Router } from 'express';

import { authenticate, authorize } from '../../middleware/auth.js';
import {
  acceptResponderAssignment,
  cancelResponderAssignment,
  completeResponderAssignment,
  listResponderAssignments,
  startResponderAssignment,
} from './responder-assignment.controller.js';

export const responderAssignmentRouter = Router();

responderAssignmentRouter.patch('/:id/accept', authenticate, authorize('VOLUNTEER', 'RESPONDER'), acceptResponderAssignment);
responderAssignmentRouter.patch('/:id/start', authenticate, authorize('VOLUNTEER', 'RESPONDER', 'COORDINATOR', 'ADMIN'), startResponderAssignment);
responderAssignmentRouter.patch('/:id/complete', authenticate, authorize('VOLUNTEER', 'RESPONDER', 'COORDINATOR', 'ADMIN'), completeResponderAssignment);
responderAssignmentRouter.patch('/:id/cancel', authenticate, authorize('VOLUNTEER', 'RESPONDER', 'COORDINATOR', 'ADMIN'), cancelResponderAssignment);
responderAssignmentRouter.get('/', authenticate, authorize('COORDINATOR', 'ADMIN', 'RESPONDER'), listResponderAssignments);
