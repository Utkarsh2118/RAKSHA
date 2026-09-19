import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../../lib/httpError.js';
import {
  assignEmergencyRequestResponder,
  createEmergencyRequest,
  getEmergencyRequestById,
  getEmergencySummary,
  getMyEmergencyRequests,
  getPriorityRequests,
  listEmergencyRequests,
  unassignEmergencyRequestResponder,
  updateEmergencyRequestStatus,
} from './emergency.service.js';

function ensureAuthenticated(req: Request): string {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  return req.user.id;
}

function parsePaginationValue(value: unknown, fieldName: 'page' | 'limit', defaultValue: number): number {
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }

  if (fieldName === 'limit' && parsed > 100) {
    throw new HttpError(400, 'limit must not exceed 100');
  }

  return parsed;
}

export async function createRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reporterId = ensureAuthenticated(req);
    const request = await createEmergencyRequest(req.body ?? {}, reporterId);

    res.status(201).json({
      status: 'success',
      message: 'Emergency request created successfully',
      request,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reporterId = ensureAuthenticated(req);
    const requests = await getMyEmergencyRequests(reporterId);

    res.status(200).json({
      status: 'success',
      requests,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRequestById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    if (!id) {
      throw new HttpError(400, 'Invalid emergency request id');
    }

    const reporterId = ensureAuthenticated(req);
    const request = await getEmergencyRequestById(id);

    if (!request) {
      throw new HttpError(404, 'Emergency request not found');
    }

    if (req.user?.role === 'VOLUNTEER') {
      throw new HttpError(403, 'Forbidden');
    }

    if (req.user?.role === 'CITIZEN' && request.reporterId !== reporterId) {
      throw new HttpError(403, 'Forbidden');
    }

    res.status(200).json({
      status: 'success',
      request,
    });
  } catch (error) {
    next(error);
  }
}

export async function listRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);

    const page = parsePaginationValue(req.query.page, 'page', 1);
    const limit = parsePaginationValue(req.query.limit, 'limit', 20);

    const result = await listEmergencyRequests({
      status: req.query.status,
      severity: req.query.severity,
      emergencyType: req.query.emergencyType,
      assignedResponderId: req.query.assignedResponderId,
      ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
    }, {
      page,
      limit,
    });

    res.status(200).json({
      status: 'success',
      requests: result.requests,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOperationalSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const summary = await getEmergencySummary();

    res.status(200).json({
      status: 'success',
      summary,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPriorityQueue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const requests = await getPriorityRequests();

    res.status(200).json({
      status: 'success',
      requests,
      count: requests.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRequestStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);

    const id = typeof req.params.id === 'string' ? req.params.id : '';

    if (!id) {
      throw new HttpError(400, 'Invalid emergency request id');
    }

    const request = await getEmergencyRequestById(id);

    if (!request) {
      throw new HttpError(404, 'Emergency request not found');
    }

    const updatedRequest = await updateEmergencyRequestStatus(id, req.body?.status);

    res.status(200).json({
      status: 'success',
      message: 'Emergency request status updated successfully',
      request: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
}

export async function assignRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);

    const id = typeof req.params.id === 'string' ? req.params.id : '';

    if (!id) {
      throw new HttpError(400, 'Invalid emergency request id');
    }

    const assignedRequest = await assignEmergencyRequestResponder(id, req.body?.assignedResponderId);

    res.status(200).json({
      status: 'success',
      message: 'Emergency request assigned successfully',
      request: assignedRequest,
    });
  } catch (error) {
    next(error);
  }
}

export async function unassignRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);

    const id = typeof req.params.id === 'string' ? req.params.id : '';

    if (!id) {
      throw new HttpError(400, 'Invalid emergency request id');
    }

    const updatedRequest = await unassignEmergencyRequestResponder(id);

    res.status(200).json({
      status: 'success',
      message: 'Emergency request unassigned successfully',
      request: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
}
