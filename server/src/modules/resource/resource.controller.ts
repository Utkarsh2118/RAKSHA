import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../../lib/httpError.js';
import {
  createResource,
  deleteResource,
  getResourceById,
  getResourceAlerts,
  getResourceAvailability,
  getInventorySummary,
  listLowStockResources,
  listResources,
  adjustResourceStock,
  updateResourceStock,
  updateResource,
} from './resource.service.js';

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

export async function createResourceRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ownerId = ensureAuthenticated(req);
    const resource = await createResource(req.body ?? {}, ownerId);

    res.status(201).json({
      status: 'success',
      message: 'Resource created successfully',
      resource,
    });
  } catch (error) {
    next(error);
  }
}

export async function listResourceRecords(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);

    const page = parsePaginationValue(req.query.page, 'page', 1);
    const limit = parsePaginationValue(req.query.limit, 'limit', 20);
    const result = await listResources({
      type: req.query.type,
      status: req.query.status,
      ownerId: req.query.ownerId,
    }, page, limit);

    res.status(200).json({
      status: 'success',
      resources: result.resources,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getResourceRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const resource = await getResourceById(id);

    res.status(200).json({
      status: 'success',
      resource,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateResourceRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const resource = await updateResource(id, req.body ?? {});

    res.status(200).json({
      status: 'success',
      message: 'Resource updated successfully',
      resource,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteResourceRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    await deleteResource(id);

    res.status(200).json({
      status: 'success',
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateResourceStockRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const resource = await updateResourceStock(
      id,
      req.body?.quantity,
      req.body?.availableQuantity,
    );

    res.status(200).json({
      status: 'success',
      message: 'Resource stock updated successfully',
      resource,
    });
  } catch (error) {
    next(error);
  }
}

export async function adjustResourceStockRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const resource = await adjustResourceStock(id, req.body?.change);

    res.status(200).json({
      status: 'success',
      message: 'Resource stock adjusted successfully',
      resource,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInventorySummaryRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const summary = await getInventorySummary();

    res.status(200).json({
      status: 'success',
      summary,
    });
  } catch (error) {
    next(error);
  }
}

export async function getResourceAvailabilityRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const availability = await getResourceAvailability();

    res.status(200).json({
      status: 'success',
      availability,
    });
  } catch (error) {
    next(error);
  }
}

export async function getResourceAlertsRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const alerts = await getResourceAlerts();

    res.status(200).json({
      status: 'success',
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function listLowStockResourceRecords(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensureAuthenticated(req);
    const resources = await listLowStockResources();

    res.status(200).json({
      status: 'success',
      resources,
      count: resources.length,
    });
  } catch (error) {
    next(error);
  }
}

