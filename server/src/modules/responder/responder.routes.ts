import { Router } from 'express';

import { authenticate, authorize } from '../../middleware/auth.js';
import {
  addResponderSkill,
  createResponderProfile,
  createResponderSkill,
  createResponderVehicle,
  deleteResponderProfile,
  deleteResponderSkill,
  deleteResponderVehicle,
  getMyResponderAvailability,
  getMyResponderProfile,
  getMyResponderVehicles,
  getResponderProfile,
  getResponderSkills,
  listResponders,
  removeResponderSkill,
  unverifyResponder,
  updateMyResponderAvailability,
  updateResponderProfile,
  updateResponderSkill,
  updateResponderVehicle,
  verifyResponder,
} from './responder.controller.js';
import { listMyResponderAssignments } from '../responder-assignment/responder-assignment.controller.js';

const selfRoles = ['VOLUNTEER', 'RESPONDER'] as const;
const operationalRoles = ['VOLUNTEER', 'RESPONDER', 'COORDINATOR', 'ADMIN'] as const;

export const responderRouter = Router();
export const responderSkillRouter = Router();

responderRouter.post('/profile', authenticate, authorize(...selfRoles), createResponderProfile);
responderRouter.get('/profile/me', authenticate, authorize(...selfRoles), getMyResponderProfile);
responderRouter.patch('/profile/me', authenticate, authorize(...selfRoles), updateResponderProfile);
responderRouter.delete('/profile/me', authenticate, authorize(...selfRoles), deleteResponderProfile);
responderRouter.post('/profile/me/skills/:skillId', authenticate, authorize(...operationalRoles), addResponderSkill);
responderRouter.delete('/profile/me/skills/:skillId', authenticate, authorize(...operationalRoles), removeResponderSkill);
responderRouter.get('/profile/me/vehicles', authenticate, authorize(...operationalRoles), getMyResponderVehicles);
responderRouter.post('/profile/me/vehicles', authenticate, authorize(...selfRoles), createResponderVehicle);
responderRouter.patch('/profile/me/vehicles/:vehicleId', authenticate, authorize(...selfRoles), updateResponderVehicle);
responderRouter.delete('/profile/me/vehicles/:vehicleId', authenticate, authorize(...selfRoles), deleteResponderVehicle);
responderRouter.get('/availability/me', authenticate, authorize(...selfRoles), getMyResponderAvailability);
responderRouter.patch('/availability/me', authenticate, authorize(...selfRoles), updateMyResponderAvailability);
responderRouter.get('/profile/me/assignments', authenticate, authorize(...selfRoles), listMyResponderAssignments);
responderRouter.get('/profile/:id', authenticate, authorize('RESPONDER', 'COORDINATOR', 'ADMIN'), getResponderProfile);
responderRouter.get('/', authenticate, authorize('COORDINATOR', 'ADMIN'), listResponders);
responderRouter.patch('/:id/verify', authenticate, authorize('COORDINATOR', 'ADMIN'), verifyResponder);
responderRouter.patch('/:id/unverify', authenticate, authorize('COORDINATOR', 'ADMIN'), unverifyResponder);

responderSkillRouter.get('/', authenticate, authorize(...operationalRoles), getResponderSkills);
responderSkillRouter.post('/', authenticate, authorize('COORDINATOR', 'ADMIN'), createResponderSkill);
responderSkillRouter.patch('/:id', authenticate, authorize('COORDINATOR', 'ADMIN'), updateResponderSkill);
responderSkillRouter.delete('/:id', authenticate, authorize('COORDINATOR', 'ADMIN'), deleteResponderSkill);