import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../../lib/httpError.js';
import {
  allocateResource,
  cancelResourceAllocation,
  listAllocationHistory,
  listEmergencyResourceAllocations,
  listResourceAllocations,
  releaseResourceAllocation,
} from './resource-allocation.service.js';

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

export async function allocateResourceRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const resourceId = typeof req.params.resourceId === 'string' ? req.params.resourceId : '';
    const allocation = await allocateResource(
      resourceId,
      req.body?.emergencyRequestId,
      req.body?.quantity,
    );

    res.status(201).json({
      status: 'success',
      message: 'Resource allocated successfully',
      allocation,
    });
  } catch (error) {
    next(error);
  }
}

export async function releaseAllocationRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const allocation = await releaseResourceAllocation(id);

    res.status(200).json({
      status: 'success',
      message: 'Resource allocation released successfully',
      allocation,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelAllocationRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const allocation = await cancelResourceAllocation(id);

    res.status(200).json({
      status: 'success',
      message: 'Resource allocation cancelled successfully',
      allocation,
    });
  } catch (error) {
    next(error);
  }
}

export async function getResourceAllocationRecords(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const resourceId = typeof req.params.resourceId === 'string' ? req.params.resourceId : '';
    const allocations = await listResourceAllocations(resourceId);

    res.status(200).json({
      status: 'success',
      allocations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmergencyAllocationRecords(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const emergencyRequestId = typeof req.params.emergencyRequestId === 'string'
      ? req.params.emergencyRequestId
      : '';
    const allocations = await listEmergencyResourceAllocations(emergencyRequestId);

    res.status(200).json({
      status: 'success',
      allocations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllocationHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const page = parsePaginationValue(req.query.page, 'page', 1);
    const limit = parsePaginationValue(req.query.limit, 'limit', 20);
    const result = await listAllocationHistory({
      status: req.query.status,
      resourceId: req.query.resourceId,
      emergencyRequestId: req.query.emergencyRequestId,
    }, page, limit);

    res.status(200).json({
      status: 'success',
      allocations: result.allocations,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}
