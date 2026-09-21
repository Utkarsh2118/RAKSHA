import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../../lib/httpError.js';
import {
  addSkillToMyProfile,
  createMyVehicle,
  createProfile,
  createSkill,
  deleteMyProfile,
  deleteMyVehicle,
  deleteSkill,
  getAvailability,
  getMyProfile,
  getProfile,
  listMyVehicles,
  listProfiles,
  listSkills,
  removeSkillFromMyProfile,
  updateAvailability,
  updateMyProfile,
  updateMyVehicle,
  updateSkill,
  updateVerification,
} from './responder.service.js';

function ensureUser(req: Request): string {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  return req.user.id;
}

function getParam(req: Request, name: string): string {
  return typeof req.params[name] === 'string' ? req.params[name] : '';
}

function parsePaginationValue(value: unknown, fieldName: 'page' | 'limit', defaultValue: number): number {
  if (typeof value === 'undefined') return defaultValue;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }
  if (fieldName === 'limit' && parsed > 100) throw new HttpError(400, 'limit must not exceed 100');
  return parsed;
}

async function respond<T>(work: () => Promise<T>, res: Response, next: NextFunction, statusCode = 200): Promise<void> {
  try {
    const result = await work();
    res.status(statusCode).json({ status: 'success', ...(result && typeof result === 'object' ? result : {}) });
  } catch (error) {
    next(error);
  }
}

export function createResponderProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ profile: await createProfile(req.body ?? {}, ensureUser(req)) }), res, next, 201);
}

export function getMyResponderProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ profile: await getMyProfile(ensureUser(req)) }), res, next);
}

export function getResponderProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => {
    const profile = await getProfile(getParam(req, 'id'));

    if (req.user?.role === 'RESPONDER' && profile.userId !== req.user.id) {
      throw new HttpError(403, 'Forbidden');
    }

    return { profile };
  }, res, next);
}

export function updateResponderProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ profile: await updateMyProfile(req.body ?? {}, ensureUser(req)) }), res, next);
}

export function deleteResponderProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => {
    await deleteMyProfile(ensureUser(req));
    return { message: 'Responder profile deleted successfully' };
  }, res, next);
}

export function listResponders(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({
    ...(await listProfiles({
      availabilityStatus: req.query.availabilityStatus,
      isVerified: req.query.isVerified,
      organization: req.query.organization,
      skill: req.query.skill,
      vehicleAvailable: req.query.vehicleAvailable,
    }, parsePaginationValue(req.query.page, 'page', 1), parsePaginationValue(req.query.limit, 'limit', 20))),
  }), res, next);
}

export function verifyResponder(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ profile: await updateVerification(getParam(req, 'id'), true) }), res, next);
}

export function unverifyResponder(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ profile: await updateVerification(getParam(req, 'id'), false) }), res, next);
}

export function getMyResponderAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ availability: await getAvailability(ensureUser(req)) }), res, next);
}

export function updateMyResponderAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ availability: await updateAvailability(ensureUser(req), req.body?.availabilityStatus) }), res, next);
}

export function getResponderSkills(_req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ skills: await listSkills() }), res, next);
}

export function createResponderSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ skill: await createSkill(req.body?.name, req.body?.description) }), res, next, 201);
}

export function updateResponderSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ skill: await updateSkill(getParam(req, 'id'), req.body?.name, req.body?.description) }), res, next);
}

export function deleteResponderSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => {
    await deleteSkill(getParam(req, 'id'));
    return { message: 'Skill deleted successfully' };
  }, res, next);
}

export function addResponderSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ profile: await addSkillToMyProfile(ensureUser(req), getParam(req, 'skillId')) }), res, next);
}

export function removeResponderSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ profile: await removeSkillFromMyProfile(ensureUser(req), getParam(req, 'skillId')) }), res, next);
}

export function getMyResponderVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ vehicles: await listMyVehicles(ensureUser(req)) }), res, next);
}

export function createResponderVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ vehicle: await createMyVehicle(ensureUser(req), req.body ?? {}) }), res, next, 201);
}

export function updateResponderVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ vehicle: await updateMyVehicle(ensureUser(req), getParam(req, 'vehicleId'), req.body ?? {}) }), res, next);
}

export function deleteResponderVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => {
    await deleteMyVehicle(ensureUser(req), getParam(req, 'vehicleId'));
    return { message: 'Vehicle deleted successfully' };
  }, res, next);
}