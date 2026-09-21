import { Prisma, ResourceStatus, ResourceType } from '@prisma/client';

import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';

const resourceSelect = {
  id: true,
  ownerId: true,
  name: true,
  type: true,
  description: true,
  quantity: true,
  availableQuantity: true,
  unit: true,
  status: true,
  locationText: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
    },
  },
} as const;

const availabilitySelect = {
  id: true,
  name: true,
  type: true,
  description: true,
  quantity: true,
  availableQuantity: true,
  unit: true,
  status: true,
  locationText: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  updatedAt: true,
} as const;

const alertSelect = {
  id: true,
  name: true,
  type: true,
  availableQuantity: true,
  quantity: true,
  unit: true,
  status: true,
  locationText: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const LOW_STOCK_THRESHOLD = 10;

type ResourceInput = {
  name?: unknown;
  type?: unknown;
  description?: unknown;
  quantity?: unknown;
  availableQuantity?: unknown;
  unit?: unknown;
  status?: unknown;
  locationText?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

function isValidEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObject).includes(value as T[keyof T]);
}

function readOptionalString(value: unknown, fieldName: string): string | null | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${fieldName} must be a non-empty string or null`);
  }

  return value.trim();
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${fieldName} is required`);
  }

  return value.trim();
}

function readQuantity(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new HttpError(400, `${fieldName} must be a non-negative integer`);
  }

  return value;
}

function readOptionalCoordinate(value: unknown, fieldName: 'latitude' | 'longitude'): number | null | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HttpError(400, `${fieldName} must be a valid number or null`);
  }

  const bounds = fieldName === 'latitude' ? 90 : 180;

  if (value < -bounds || value > bounds) {
    throw new HttpError(400, `${fieldName} must be between ${-bounds} and ${bounds}`);
  }

  return value;
}

function readResourceType(value: unknown): ResourceType {
  if (!isValidEnumValue(ResourceType, value)) {
    throw new HttpError(400, 'Invalid resource type');
  }

  return value;
}

function readResourceStatus(value: unknown): ResourceStatus {
  if (!isValidEnumValue(ResourceStatus, value)) {
    throw new HttpError(400, 'Invalid resource status');
  }

  return value;
}

export function calculateStockStatus(
  availableQuantity: number,
  currentStatus?: ResourceStatus,
): ResourceStatus {
  if (currentStatus === ResourceStatus.UNAVAILABLE) {
    return ResourceStatus.UNAVAILABLE;
  }

  if (availableQuantity <= 0) {
    return ResourceStatus.OUT_OF_STOCK;
  }

  return availableQuantity <= LOW_STOCK_THRESHOLD
    ? ResourceStatus.LOW_STOCK
    : ResourceStatus.AVAILABLE;
}

function validateQuantities(quantity: number, availableQuantity: number): void {
  if (availableQuantity > quantity) {
    throw new HttpError(400, 'availableQuantity cannot exceed quantity');
  }
}

function normalizeId(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, 'Invalid resource id');
  }

  return id;
}

function buildCreateData(input: ResourceInput, ownerId: string): Prisma.ResourceCreateInput {
  const name = readRequiredString(input.name, 'name');
  const type = readResourceType(input.type);
  const quantity = readQuantity(input.quantity, 'quantity');
  const availableQuantity = readQuantity(input.availableQuantity, 'availableQuantity');
  const unit = readRequiredString(input.unit, 'unit');
  const requestedStatus = typeof input.status === 'undefined'
    ? undefined
    : readResourceStatus(input.status);
  const status = calculateStockStatus(availableQuantity, requestedStatus);

  validateQuantities(quantity, availableQuantity);

  const data: Prisma.ResourceCreateInput = {
    owner: { connect: { id: ownerId } },
    name,
    type,
    quantity,
    availableQuantity,
    unit,
    status,
  };

  const description = readOptionalString(input.description, 'description');
  const locationText = readOptionalString(input.locationText, 'locationText');
  const latitude = readOptionalCoordinate(input.latitude, 'latitude');
  const longitude = readOptionalCoordinate(input.longitude, 'longitude');

  if (description !== undefined) data.description = description;
  if (locationText !== undefined) data.locationText = locationText;
  if (latitude !== undefined) data.latitude = latitude;
  if (longitude !== undefined) data.longitude = longitude;

  return data;
}

export async function createResource(input: ResourceInput, ownerId: string) {
  try {
    return await prisma.resource.create({
      data: buildCreateData(input, ownerId),
      select: resourceSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(400, 'Resource owner not found');
    }

    throw error;
  }
}

function normalizeFilterValue(value: unknown, fieldName: string): string | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${fieldName} filter is invalid`);
  }

  return value.trim();
}

export async function listResources(filters: {
  type?: unknown;
  status?: unknown;
  ownerId?: unknown;
}, page: number, limit: number) {
  const type = normalizeFilterValue(filters.type, 'type');
  const status = normalizeFilterValue(filters.status, 'status');
  const ownerId = normalizeFilterValue(filters.ownerId, 'ownerId');
  const where: Prisma.ResourceWhereInput = {};

  if (type) {
    where.type = readResourceType(type);
  }

  if (status) {
    where.status = readResourceStatus(status);
  }

  if (ownerId) {
    where.ownerId = normalizeId(ownerId);
  }

  const total = await prisma.resource.count({ where });
  const resources = await prisma.resource.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    select: resourceSelect,
  });

  return {
    resources,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function getResourceById(id: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: normalizeId(id) },
    select: resourceSelect,
  });

  if (!resource) {
    throw new HttpError(404, 'Resource not found');
  }

  return resource;
}

export async function updateResource(id: string, input: ResourceInput) {
  const resourceId = normalizeId(id);

  return updateResourceStockWithRetry(() => prisma.$transaction(async (transaction) => {
    const existing = await transaction.resource.findUnique({
      where: { id: resourceId },
      select: {
        quantity: true,
        availableQuantity: true,
        status: true,
      },
    });

    if (!existing) {
      throw new HttpError(404, 'Resource not found');
    }

    const data: Prisma.ResourceUpdateInput = {};
    const description = readOptionalString(input.description, 'description');
    const locationText = readOptionalString(input.locationText, 'locationText');
    const latitude = readOptionalCoordinate(input.latitude, 'latitude');
    const longitude = readOptionalCoordinate(input.longitude, 'longitude');
    const quantity = typeof input.quantity === 'undefined'
      ? existing.quantity
      : readQuantity(input.quantity, 'quantity');
    const availableQuantity = typeof input.availableQuantity === 'undefined'
      ? existing.availableQuantity
      : readQuantity(input.availableQuantity, 'availableQuantity');
    const quantitiesChanged = typeof input.quantity !== 'undefined' || typeof input.availableQuantity !== 'undefined';
    const requestedStatus = typeof input.status === 'undefined'
      ? undefined
      : readResourceStatus(input.status);
    const status = calculateStockStatus(
      availableQuantity,
      requestedStatus ?? (existing.status === ResourceStatus.UNAVAILABLE ? existing.status : undefined),
    );

    validateQuantities(quantity, availableQuantity);

    if (typeof input.name !== 'undefined') data.name = readRequiredString(input.name, 'name');
    if (typeof input.type !== 'undefined') data.type = readResourceType(input.type);
    if (description !== undefined) data.description = description;
    if (typeof input.quantity !== 'undefined') data.quantity = quantity;
    if (typeof input.availableQuantity !== 'undefined') data.availableQuantity = availableQuantity;
    if (typeof input.unit !== 'undefined') data.unit = readRequiredString(input.unit, 'unit');
    if (typeof input.status !== 'undefined' || quantitiesChanged) data.status = status;
    if (locationText !== undefined) data.locationText = locationText;
    if (latitude !== undefined) data.latitude = latitude;
    if (longitude !== undefined) data.longitude = longitude;

    return transaction.resource.update({
      where: { id: resourceId },
      data,
      select: resourceSelect,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function updateResourceStock(
  id: string,
  quantityInput: unknown,
  availableQuantityInput: unknown,
) {
  const resourceId = normalizeId(id);
  const quantity = readQuantity(quantityInput, 'quantity');
  const availableQuantity = readQuantity(availableQuantityInput, 'availableQuantity');

  validateQuantities(quantity, availableQuantity);

  return updateResourceStockWithRetry(() => prisma.$transaction(async (transaction) => {
    const existing = await transaction.resource.findUnique({
      where: { id: resourceId },
      select: { status: true },
    });

    if (!existing) {
      throw new HttpError(404, 'Resource not found');
    }

    return transaction.resource.update({
      where: { id: resourceId },
      data: {
        quantity,
        availableQuantity,
        status: calculateStockStatus(availableQuantity, existing.status),
      },
      select: resourceSelect,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

async function updateResourceStockWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) {
        throw error;
      }
    }
  }

  throw new HttpError(409, 'Resource stock update could not be completed');
}

export async function adjustResourceStock(id: string, changeInput: unknown) {
  if (typeof changeInput !== 'number' || !Number.isFinite(changeInput) || !Number.isSafeInteger(changeInput)) {
    throw new HttpError(400, 'change must be a finite integer');
  }

  const resourceId = normalizeId(id);

  return updateResourceStockWithRetry(() => prisma.$transaction(async (transaction) => {
    const existing = await transaction.resource.findUnique({
      where: { id: resourceId },
      select: { quantity: true, availableQuantity: true, status: true },
    });

    if (!existing) {
      throw new HttpError(404, 'Resource not found');
    }

    const availableQuantity = existing.availableQuantity + changeInput;

    if (availableQuantity < 0) {
      throw new HttpError(400, 'resulting availableQuantity cannot be negative');
    }

    if (availableQuantity > existing.quantity) {
      throw new HttpError(400, 'resulting availableQuantity cannot exceed quantity');
    }

    return transaction.resource.update({
      where: { id: resourceId },
      data: {
        availableQuantity,
        status: calculateStockStatus(availableQuantity, existing.status),
      },
      select: resourceSelect,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function getInventorySummary() {
  const [totalResources, available, lowStock, outOfStock, unavailable, totals] = await Promise.all([
    prisma.resource.count(),
    prisma.resource.count({ where: { status: ResourceStatus.AVAILABLE } }),
    prisma.resource.count({ where: { status: ResourceStatus.LOW_STOCK } }),
    prisma.resource.count({ where: { status: ResourceStatus.OUT_OF_STOCK } }),
    prisma.resource.count({ where: { status: ResourceStatus.UNAVAILABLE } }),
    prisma.resource.aggregate({
      _sum: { quantity: true, availableQuantity: true },
    }),
  ]);

  return {
    totalResources,
    available,
    lowStock,
    outOfStock,
    unavailable,
    totalQuantity: totals._sum.quantity ?? 0,
    totalAvailableQuantity: totals._sum.availableQuantity ?? 0,
  };
}

export async function getResourceAvailability() {
  const [available, lowStock, outOfStock, unavailable] = await Promise.all([
    prisma.resource.findMany({
      where: { status: ResourceStatus.AVAILABLE },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: availabilitySelect,
    }),
    prisma.resource.findMany({
      where: { status: ResourceStatus.LOW_STOCK },
      orderBy: { createdAt: 'desc' },
      select: availabilitySelect,
    }),
    prisma.resource.findMany({
      where: { status: ResourceStatus.OUT_OF_STOCK },
      orderBy: { createdAt: 'desc' },
      select: availabilitySelect,
    }),
    prisma.resource.findMany({
      where: { status: ResourceStatus.UNAVAILABLE },
      orderBy: { createdAt: 'desc' },
      select: availabilitySelect,
    }),
  ]);

  return { available, lowStock, outOfStock, unavailable };
}

export async function getResourceAlerts() {
  const [outOfStock, lowStock] = await Promise.all([
    prisma.resource.findMany({
      where: { status: ResourceStatus.OUT_OF_STOCK },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      select: alertSelect,
    }),
    prisma.resource.findMany({
      where: { status: ResourceStatus.LOW_STOCK },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      select: alertSelect,
    }),
  ]);

  return [...outOfStock, ...lowStock].map((resource) => ({
    resourceId: resource.id,
    resourceName: resource.name,
    resourceType: resource.type,
    currentAvailableQuantity: resource.availableQuantity,
    totalQuantity: resource.quantity,
    unit: resource.unit,
    status: resource.status,
    severity: resource.status === ResourceStatus.OUT_OF_STOCK ? 'CRITICAL' : 'WARNING',
    locationText: resource.locationText,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  }));
}

export async function listLowStockResources() {
  const [outOfStock, lowStock] = await Promise.all([
    prisma.resource.findMany({
      where: { status: ResourceStatus.OUT_OF_STOCK },
      orderBy: { createdAt: 'desc' },
      select: resourceSelect,
    }),
    prisma.resource.findMany({
      where: { status: ResourceStatus.LOW_STOCK },
      orderBy: { createdAt: 'desc' },
      select: resourceSelect,
    }),
  ]);

  return [...outOfStock, ...lowStock];
}

export async function deleteResource(id: string): Promise<void> {
  const resourceId = normalizeId(id);

  try {
    await updateResourceStockWithRetry(() => prisma.$transaction(async (transaction) => {
      const existing = await transaction.resource.findUnique({
        where: { id: resourceId },
        select: { id: true },
      });

      if (!existing) {
        throw new HttpError(404, 'Resource not found');
      }

      const allocationCount = await transaction.resourceAllocation.count({
        where: { resourceId },
      });

      if (allocationCount > 0) {
        throw new HttpError(409, 'Resource cannot be deleted while allocations exist');
      }

      await transaction.resource.delete({ where: { id: resourceId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new HttpError(409, 'Resource cannot be deleted while allocations exist');
    }

    throw error;
  }
}
