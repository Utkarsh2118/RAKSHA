import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../../lib/httpError.js';
import {
  acceptAssignment,
  assignResponder,
  cancelAssignment,
  completeAssignment,
  findResponderCandidates,
  listAssignments,
  listEmergencyAssignments,
  listMyAssignments,
  startAssignment,
} from './responder-assignment.service.js';

function ensureUser(req: Request): { id: string; role: string } {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  return req.user;
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

export function assignResponderRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({
    assignment: await assignResponder(getParam(req, 'emergencyRequestId'), getParam(req, 'responderProfileId'), ensureUser(req).id),
  }), res, next, 201);
}

export function acceptResponderAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ assignment: await acceptAssignment(getParam(req, 'id'), ensureUser(req).id) }), res, next);
}

export function startResponderAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ assignment: await startAssignment(getParam(req, 'id'), ensureUser(req).id) }), res, next);
}

export function completeResponderAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ assignment: await completeAssignment(getParam(req, 'id'), ensureUser(req).id) }), res, next);
}

export function cancelResponderAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ assignment: await cancelAssignment(getParam(req, 'id'), ensureUser(req).id) }), res, next);
}

export function listResponderAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({
    ...(await listAssignments({
      status: req.query.status,
      emergencyRequestId: req.query.emergencyRequestId,
      responderProfileId: req.query.responderProfileId,
    }, parsePaginationValue(req.query.page, 'page', 1), parsePaginationValue(req.query.limit, 'limit', 20), ensureUser(req).id, ensureUser(req).role)),
  }), res, next);
}

export function listEmergencyResponderAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({
    assignments: await listEmergencyAssignments(getParam(req, 'emergencyRequestId'), ensureUser(req).id, ensureUser(req).role),
  }), res, next);
}

export function listMyResponderAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({ assignments: await listMyAssignments(ensureUser(req).id) }), res, next);
}

export function listResponderCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(async () => ({
    candidates: await findResponderCandidates(getParam(req, 'emergencyRequestId')),
  }), res, next);
}
