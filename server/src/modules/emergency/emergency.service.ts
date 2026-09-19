import { EmergencyStatus, EmergencyType, Severity, type Prisma } from '@prisma/client';

import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';

const requestSelect = {
  id: true,
  reporterId: true,
  assignedResponderId: true,
  emergencyType: true,
  title: true,
  description: true,
  peopleAffected: true,
  severity: true,
  latitude: true,
  longitude: true,
  locationText: true,
  requiredHelp: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  reporter: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
  assignedResponder: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
} as const;

const operationalRoles = ['RESPONDER', 'COORDINATOR', 'ADMIN'] as const;

export function validateLifecycleTransition(currentStatus: EmergencyStatus, nextStatus: EmergencyStatus): void {
  const allowedTransitions: Record<EmergencyStatus, EmergencyStatus[]> = {
    REPORTED: [EmergencyStatus.VERIFIED, EmergencyStatus.CANCELLED],
    VERIFIED: [EmergencyStatus.ASSIGNED, EmergencyStatus.CANCELLED],
    ASSIGNED: [EmergencyStatus.IN_PROGRESS, EmergencyStatus.VERIFIED, EmergencyStatus.CANCELLED],
    IN_PROGRESS: [EmergencyStatus.RESOLVED, EmergencyStatus.CANCELLED],
    RESOLVED: [],
    CANCELLED: [],
  };

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw new HttpError(400, `Invalid status transition from ${currentStatus} to ${nextStatus}`);
  }
}

function isOperationalRole(role: unknown): role is 'RESPONDER' | 'COORDINATOR' | 'ADMIN' {
  return typeof role === 'string' && operationalRoles.includes(role as (typeof operationalRoles)[number]);
}

function normalizeRequiredHelp(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function isValidEnumValue<T extends Record<string, string>>(enumObject: T, value: unknown): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObject).includes(value as T[keyof T]);
}

function ensureValidCoordinate(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new HttpError(400, `${fieldName} must be a valid number`);
  }

  if (fieldName === 'latitude' && (value < -90 || value > 90)) {
    throw new HttpError(400, 'latitude must be between -90 and 90');
  }

  if (fieldName === 'longitude' && (value < -180 || value > 180)) {
    throw new HttpError(400, 'longitude must be between -180 and 180');
  }

  return value;
}

function normalizeStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    const normalized = value[0].trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

export async function createEmergencyRequest(input: {
  emergencyType: unknown;
  title: unknown;
  description: unknown;
  peopleAffected: unknown;
  severity: unknown;
  latitude: unknown;
  longitude: unknown;
  locationText: unknown;
  requiredHelp: unknown;
}, reporterId: string) {
  const emergencyType = input.emergencyType;
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const locationText = typeof input.locationText === 'string' ? input.locationText.trim() : '';
  const requiredHelp = normalizeRequiredHelp(input.requiredHelp);

  if (!isValidEnumValue(EmergencyType, emergencyType)) {
    throw new HttpError(400, 'Invalid emergencyType');
  }

  if (!title) {
    throw new HttpError(400, 'Title is required');
  }

  if (!description) {
    throw new HttpError(400, 'Description is required');
  }

  if (
    typeof input.peopleAffected !== 'number' ||
    !Number.isInteger(input.peopleAffected) ||
    input.peopleAffected < 0
  ) {
    throw new HttpError(400, 'peopleAffected must be a non-negative integer');
  }

  if (!isValidEnumValue(Severity, input.severity)) {
    throw new HttpError(400, 'Invalid severity');
  }

  if (!locationText) {
    throw new HttpError(400, 'locationText is required');
  }

  if (requiredHelp.length === 0) {
    throw new HttpError(400, 'requiredHelp is required');
  }

  const latitude = ensureValidCoordinate(input.latitude, 'latitude');
  const longitude = ensureValidCoordinate(input.longitude, 'longitude');

  const request = await prisma.emergencyRequest.create({
    data: {
      reporterId,
      emergencyType: emergencyType as EmergencyType,
      title,
      description,
      peopleAffected: input.peopleAffected,
      severity: input.severity as Severity,
      latitude,
      longitude,
      locationText,
      requiredHelp,
      status: EmergencyStatus.REPORTED,
    },
    select: requestSelect,
  });

  return request;
}

export async function getMyEmergencyRequests(reporterId: string) {
  return prisma.emergencyRequest.findMany({
    where: { reporterId },
    orderBy: { createdAt: 'desc' },
    select: requestSelect,
  });
}

export async function getEmergencyRequestById(id: string) {
  return prisma.emergencyRequest.findUnique({
    where: { id },
    select: requestSelect,
  });
}

export async function listEmergencyRequests(
  filters: {
    status?: unknown;
    severity?: unknown;
    emergencyType?: unknown;
    assignedResponderId?: unknown;
    search?: string;
  },
  pagination: {
    page: number;
    limit: number;
  },
) {
  const where: Prisma.EmergencyRequestWhereInput = {};

  if (typeof filters.status !== 'undefined') {
    if (!isValidEnumValue(EmergencyStatus, filters.status)) {
      throw new HttpError(400, 'Invalid status filter');
    }
    where.status = filters.status as EmergencyStatus;
  }

  if (typeof filters.severity !== 'undefined') {
    if (!isValidEnumValue(Severity, filters.severity)) {
      throw new HttpError(400, 'Invalid severity filter');
    }
    where.severity = filters.severity as Severity;
  }

  if (typeof filters.emergencyType !== 'undefined') {
    if (!isValidEnumValue(EmergencyType, filters.emergencyType)) {
      throw new HttpError(400, 'Invalid emergencyType filter');
    }
    where.emergencyType = filters.emergencyType as EmergencyType;
  }

  if (typeof filters.assignedResponderId !== 'undefined') {
    const assignedResponderId = normalizeStringValue(filters.assignedResponderId);

    if (!assignedResponderId) {
      throw new HttpError(400, 'assignedResponderId filter is invalid');
    }

    where.assignedResponderId = assignedResponderId;
  }

  const search = normalizeStringValue(filters.search);

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { locationText: { contains: search, mode: 'insensitive' } },
      { requiredHelp: { hasSome: [search] } },
    ];
  }

  const total = await prisma.emergencyRequest.count({ where });
  const requests = await prisma.emergencyRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit,
    select: requestSelect,
  });

  return {
    requests,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit),
  };
}

export async function updateEmergencyRequestStatus(id: string, status: unknown) {
  if (!isValidEnumValue(EmergencyStatus, status)) {
    throw new HttpError(400, 'Invalid status');
  }

  const existingRequest = await prisma.emergencyRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existingRequest) {
    throw new HttpError(404, 'Emergency request not found');
  }

  validateLifecycleTransition(existingRequest.status, status as EmergencyStatus);

  return prisma.emergencyRequest.update({
    where: { id },
    data: { status: status as EmergencyStatus },
    select: requestSelect,
  });
}

export async function assignEmergencyRequestResponder(id: string, assignedResponderId: unknown) {
  if (typeof assignedResponderId !== 'string' || assignedResponderId.trim() === '') {
    throw new HttpError(400, 'assignedResponderId is required');
  }

  const request = await prisma.emergencyRequest.findUnique({
    where: { id },
    select: { id: true, status: true, assignedResponderId: true },
  });

  if (!request) {
    throw new HttpError(404, 'Emergency request not found');
  }

  const assignedUser = await prisma.user.findUnique({
    where: { id: assignedResponderId },
    select: { id: true, role: true, isActive: true },
  });

  if (!assignedUser) {
    throw new HttpError(404, 'Assigned responder not found');
  }

  if (!assignedUser.isActive) {
    throw new HttpError(400, 'Assigned responder is inactive');
  }

  if (!isOperationalRole(assignedUser.role)) {
    throw new HttpError(400, 'Assigned responder must be a RESPONDER, COORDINATOR, or ADMIN');
  }

  const nextStatus = request.status === EmergencyStatus.REPORTED || request.status === EmergencyStatus.VERIFIED
    ? EmergencyStatus.ASSIGNED
    : request.status;

  if (request.status !== EmergencyStatus.REPORTED && request.status !== EmergencyStatus.VERIFIED && request.status !== EmergencyStatus.ASSIGNED) {
    throw new HttpError(400, 'Emergency request cannot be assigned in its current status');
  }

  if (request.status === EmergencyStatus.ASSIGNED) {
    return prisma.emergencyRequest.update({
      where: { id },
      data: {
        assignedResponderId,
        status: EmergencyStatus.ASSIGNED,
      },
      select: requestSelect,
    });
  }

  validateLifecycleTransition(request.status, nextStatus);

  return prisma.emergencyRequest.update({
    where: { id },
    data: {
      assignedResponderId,
      status: nextStatus,
    },
    select: requestSelect,
  });
}

export async function unassignEmergencyRequestResponder(id: string) {
  const request = await prisma.emergencyRequest.findUnique({
    where: { id },
    select: { id: true, status: true, assignedResponderId: true },
  });

  if (!request) {
    throw new HttpError(404, 'Emergency request not found');
  }

  if (request.status === EmergencyStatus.ASSIGNED) {
    validateLifecycleTransition(request.status, EmergencyStatus.VERIFIED);
  }

  if (request.status === EmergencyStatus.RESOLVED || request.status === EmergencyStatus.CANCELLED) {
    throw new HttpError(400, `Invalid status transition from ${request.status} to ${EmergencyStatus.VERIFIED}`);
  }

  return prisma.emergencyRequest.update({
    where: { id },
    data: {
      assignedResponderId: null,
      status: request.status === EmergencyStatus.ASSIGNED ? EmergencyStatus.VERIFIED : request.status,
    },
    select: requestSelect,
  });
}

export async function getEmergencySummary() {
  const [total, statusCounts, severityCounts] = await Promise.all([
    prisma.emergencyRequest.count(),
    prisma.emergencyRequest.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.emergencyRequest.groupBy({
      by: ['severity'],
      _count: { severity: true },
    }),
  ]);

  const statusSummary = Object.fromEntries(
    Object.values(EmergencyStatus).map((status) => [status.toLowerCase(), 0]),
  );

  for (const item of statusCounts) {
    statusSummary[item.status.toLowerCase()] = item._count.status;
  }

  const severitySummary = Object.fromEntries(
    Object.values(Severity).map((severity) => [severity.toLowerCase(), 0]),
  );

  for (const item of severityCounts) {
    severitySummary[item.severity.toLowerCase()] = item._count.severity;
  }

  return {
    total,
    reported: statusSummary.reported,
    verified: statusSummary.verified,
    assigned: statusSummary.assigned,
    inProgress: statusSummary.in_progress,
    resolved: statusSummary.resolved,
    cancelled: statusSummary.cancelled,
    critical: severitySummary.critical,
    high: severitySummary.high,
  };
}

export async function getPriorityRequests() {
  const requests = await prisma.emergencyRequest.findMany({
    where: {
      status: {
        notIn: [EmergencyStatus.RESOLVED, EmergencyStatus.CANCELLED],
      },
      OR: [{ severity: Severity.CRITICAL }, { severity: Severity.HIGH }],
    },
    orderBy: { createdAt: 'desc' },
    select: requestSelect,
  });

  const severityPriority: Record<Severity, number> = {
    CRITICAL: 2,
    HIGH: 1,
    MEDIUM: 0,
    LOW: 0,
  };

  return [...requests].sort((left, right) => {
    const severityDelta = severityPriority[right.severity] - severityPriority[left.severity];

    if (severityDelta !== 0) {
      return severityDelta;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}
