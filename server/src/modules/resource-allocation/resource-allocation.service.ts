import {
  EmergencyStatus,
  Prisma,
  ResourceAllocationStatus,
  ResourceStatus,
} from '@prisma/client';

import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { calculateStockStatus } from '../resource/resource.service.js';

const allocationSelect = {
  id: true,
  quantity: true,
  status: true,
  allocatedAt: true,
  releasedAt: true,
  createdAt: true,
  updatedAt: true,
  resource: {
    select: {
      id: true,
      name: true,
      type: true,
      unit: true,
    },
  },
  emergencyRequest: {
    select: {
      id: true,
      title: true,
      emergencyType: true,
      severity: true,
      status: true,
    },
  },
} as const;

const resourceAllocationListSelect = {
  id: true,
  quantity: true,
  status: true,
  allocatedAt: true,
  releasedAt: true,
  resource: {
    select: {
      id: true,
      name: true,
      type: true,
      unit: true,
    },
  },
  emergencyRequest: {
    select: {
      id: true,
      title: true,
      emergencyType: true,
      severity: true,
      status: true,
    },
  },
} as const;

const emergencyAllocationSelect = {
  id: true,
  quantity: true,
  status: true,
  allocatedAt: true,
  releasedAt: true,
  resource: {
    select: {
      id: true,
      name: true,
      type: true,
      unit: true,
    },
  },
} as const;

function normalizeId(id: string, fieldName: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }

  return id;
}

function readPositiveQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new HttpError(400, 'quantity must be a positive finite integer');
  }

  return value;
}

function readStatusFilter(value: unknown): ResourceAllocationStatus | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value !== 'string' || !Object.values(ResourceAllocationStatus).includes(value as ResourceAllocationStatus)) {
    throw new HttpError(400, 'Invalid allocation status filter');
  }

  return value as ResourceAllocationStatus;
}

async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) {
        throw error;
      }
    }
  }

  throw new HttpError(409, 'Allocation operation could not be completed');
}

export async function allocateResource(
  resourceId: string,
  emergencyRequestIdInput: unknown,
  quantityInput: unknown,
) {
  const normalizedResourceId = normalizeId(resourceId, 'resource id');
  const emergencyRequestId = typeof emergencyRequestIdInput === 'string'
    ? normalizeId(emergencyRequestIdInput, 'emergency request id')
    : (() => { throw new HttpError(400, 'emergencyRequestId is required'); })();
  const quantity = readPositiveQuantity(quantityInput);

  return withSerializableRetry(() => prisma.$transaction(async (transaction) => {
    const resource = await transaction.resource.findUnique({
      where: { id: normalizedResourceId },
      select: { quantity: true, availableQuantity: true, status: true },
    });

    if (!resource) {
      throw new HttpError(404, 'Resource not found');
    }

    if (resource.status === ResourceStatus.UNAVAILABLE) {
      throw new HttpError(400, 'Resource is unavailable');
    }

    const emergencyRequest = await transaction.emergencyRequest.findUnique({
      where: { id: emergencyRequestId },
      select: { status: true },
    });

    if (!emergencyRequest) {
      throw new HttpError(404, 'Emergency request not found');
    }

    if (emergencyRequest.status === EmergencyStatus.RESOLVED || emergencyRequest.status === EmergencyStatus.CANCELLED) {
      throw new HttpError(400, 'Resources cannot be allocated to a resolved or cancelled emergency request');
    }

    const availableQuantity = resource.availableQuantity - quantity;

    if (availableQuantity < 0) {
      throw new HttpError(400, 'Insufficient available resource quantity');
    }

    const allocation = await transaction.resourceAllocation.create({
      data: {
        resourceId: normalizedResourceId,
        emergencyRequestId,
        quantity,
        status: ResourceAllocationStatus.ALLOCATED,
        allocatedAt: new Date(),
        releasedAt: null,
      },
      select: allocationSelect,
    });

    await transaction.resource.update({
      where: { id: normalizedResourceId },
      data: {
        availableQuantity,
        status: calculateStockStatus(availableQuantity, resource.status),
      },
    });

    return allocation;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

async function changeAllocationStatus(
  id: string,
  nextStatus: 'RELEASED' | 'CANCELLED',
) {
  const allocationId = normalizeId(id, 'allocation id');

  return withSerializableRetry(() => prisma.$transaction(async (transaction) => {
    const allocation = await transaction.resourceAllocation.findUnique({
      where: { id: allocationId },
      select: {
        quantity: true,
        status: true,
        resource: {
          select: {
            quantity: true,
            availableQuantity: true,
            status: true,
          },
        },
      },
    });

    if (!allocation) {
      throw new HttpError(404, 'Resource allocation not found');
    }

    if (allocation.status !== ResourceAllocationStatus.ALLOCATED) {
      throw new HttpError(400, 'Only an active allocation can be changed');
    }

    const availableQuantity = allocation.resource.availableQuantity + allocation.quantity;

    if (availableQuantity > allocation.resource.quantity) {
      throw new HttpError(409, 'Resource stock is inconsistent with this allocation');
    }

    const updated = await transaction.resourceAllocation.update({
      where: { id: allocationId },
      data: {
        status: nextStatus,
        releasedAt: new Date(),
      },
      select: allocationSelect,
    });

    await transaction.resource.update({
      where: { id: updated.resource.id },
      data: {
        availableQuantity,
        status: calculateStockStatus(availableQuantity, allocation.resource.status),
      },
    });

    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function releaseResourceAllocation(id: string) {
  return changeAllocationStatus(id, ResourceAllocationStatus.RELEASED);
}

export async function cancelResourceAllocation(id: string) {
  return changeAllocationStatus(id, ResourceAllocationStatus.CANCELLED);
}

export async function listResourceAllocations(resourceId: string) {
  const normalizedResourceId = normalizeId(resourceId, 'resource id');
  const resource = await prisma.resource.findUnique({
    where: { id: normalizedResourceId },
    select: { id: true },
  });

  if (!resource) {
    throw new HttpError(404, 'Resource not found');
  }

  return prisma.resourceAllocation.findMany({
    where: { resourceId: normalizedResourceId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: resourceAllocationListSelect,
  });
}

export async function listEmergencyResourceAllocations(emergencyRequestId: string) {
  const normalizedEmergencyRequestId = normalizeId(emergencyRequestId, 'emergency request id');
  const emergencyRequest = await prisma.emergencyRequest.findUnique({
    where: { id: normalizedEmergencyRequestId },
    select: { id: true },
  });

  if (!emergencyRequest) {
    throw new HttpError(404, 'Emergency request not found');
  }

  return prisma.resourceAllocation.findMany({
    where: { emergencyRequestId: normalizedEmergencyRequestId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: emergencyAllocationSelect,
  });
}

export async function listAllocationHistory(filters: {
  status?: unknown;
  resourceId?: unknown;
  emergencyRequestId?: unknown;
}, page: number, limit: number) {
  const status = readStatusFilter(filters.status);
  const resourceId = typeof filters.resourceId === 'undefined'
    ? undefined
    : normalizeId(String(filters.resourceId), 'resource id');
  const emergencyRequestId = typeof filters.emergencyRequestId === 'undefined'
    ? undefined
    : normalizeId(String(filters.emergencyRequestId), 'emergency request id');
  const where: Prisma.ResourceAllocationWhereInput = {
    ...(status ? { status } : {}),
    ...(resourceId ? { resourceId } : {}),
    ...(emergencyRequestId ? { emergencyRequestId } : {}),
  };

  const total = await prisma.resourceAllocation.count({ where });
  const allocations = await prisma.resourceAllocation.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * limit,
    take: limit,
    select: resourceAllocationListSelect,
  });

  return {
    allocations,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
