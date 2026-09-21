import {
  AvailabilityStatus,
  EmergencyStatus,
  Prisma,
  ResponderAssignmentStatus,
  VehicleType,
} from '@prisma/client';

import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';

const activeAssignmentStatuses = [
  ResponderAssignmentStatus.ASSIGNED,
  ResponderAssignmentStatus.ACCEPTED,
  ResponderAssignmentStatus.IN_PROGRESS,
] as const;

const MAX_ACTIVE_ASSIGNMENTS = 3;

const assignmentSelect = {
  id: true,
  emergencyRequestId: true,
  responderProfileId: true,
  assignedById: true,
  status: true,
  assignedAt: true,
  acceptedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  emergencyRequest: {
    select: {
      id: true,
      title: true,
      emergencyType: true,
      severity: true,
      status: true,
      requiredHelp: true,
      locationText: true,
      latitude: true,
      longitude: true,
    },
  },
  responderProfile: {
    select: {
      id: true,
      availabilityStatus: true,
      isVerified: true,
      locationText: true,
      user: { select: { id: true, name: true, email: true, role: true } },
      skills: {
        select: { skill: { select: { id: true, name: true, description: true } } },
      },
      vehicles: {
        select: { id: true, vehicleType: true, vehicleNumber: true, capacity: true, isAvailable: true },
      },
    },
  },
  assignedBy: { select: { id: true, name: true, email: true, role: true } },
} as const;

const emergencyResponderSelect = {
  id: true,
  status: true,
  assignedAt: true,
  acceptedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  responderProfile: {
    select: {
      id: true,
      availabilityStatus: true,
      isVerified: true,
      locationText: true,
      user: { select: { id: true, name: true, role: true } },
      skills: { select: { skill: { select: { id: true, name: true, description: true } } } },
      vehicles: { select: { id: true, vehicleType: true, vehicleNumber: true, capacity: true, isAvailable: true } },
    },
  },
} as const;

function normalizeId(value: unknown, fieldName: string): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }

  return value;
}

function readStatus(value: unknown): ResponderAssignmentStatus | undefined {
  if (typeof value === 'undefined') return undefined;
  if (typeof value !== 'string' || !Object.values(ResponderAssignmentStatus).includes(value as ResponderAssignmentStatus)) {
    throw new HttpError(400, 'Invalid assignment status filter');
  }
  return value as ResponderAssignmentStatus;
}

function isActiveAssignment(status: ResponderAssignmentStatus): boolean {
  return activeAssignmentStatuses.includes(status as (typeof activeAssignmentStatuses)[number]);
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

  throw new HttpError(409, 'Assignment operation could not be completed');
}

async function getProfileIdForUser(userId: string): Promise<string> {
  const profile = await prisma.responderProfile.findUnique({
    where: { userId: normalizeId(userId, 'user id') },
    select: { id: true },
  });

  if (!profile) throw new HttpError(404, 'Responder profile not found');
  return profile.id;
}

function mapSkillRequirements(emergencyType: string, requiredHelp: string[]): string[] {
  const names = new Set<string>();
  const add = (...values: string[]) => values.forEach((value) => names.add(value));

  if (emergencyType === 'MEDICAL') add('MEDICAL', 'FIRST_AID', 'PARAMEDIC');
  if (emergencyType === 'FIRE') add('FIRE_RESCUE', 'SEARCH_AND_RESCUE');
  if (emergencyType === 'FLOOD') add('FLOOD_RESCUE', 'SEARCH_AND_RESCUE');
  if (emergencyType === 'ACCIDENT') add('MEDICAL', 'FIRST_AID', 'DRIVING');

  requiredHelp.forEach((help) => {
    const normalized = help.trim().replace(/\s+/g, '_').toUpperCase();
    if (normalized) names.add(normalized);
  });

  return [...names];
}

export async function findResponderCandidates(emergencyRequestIdInput: string) {
  const emergencyRequestId = normalizeId(emergencyRequestIdInput, 'emergency request id');
  const emergency = await prisma.emergencyRequest.findUnique({
    where: { id: emergencyRequestId },
    select: { id: true, emergencyType: true, requiredHelp: true, status: true },
  });

  if (!emergency) throw new HttpError(404, 'Emergency request not found');
  if (emergency.status === EmergencyStatus.RESOLVED || emergency.status === EmergencyStatus.CANCELLED) {
    throw new HttpError(400, 'Responder candidates are unavailable for a resolved or cancelled emergency');
  }

  const requiredSkills = mapSkillRequirements(emergency.emergencyType, emergency.requiredHelp);
  const profiles = await prisma.responderProfile.findMany({
    where: {
      isVerified: true,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      user: { isActive: true, role: { in: ['VOLUNTEER', 'RESPONDER'] } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      availabilityStatus: true,
      isVerified: true,
      locationText: true,
      user: { select: { id: true, name: true, role: true } },
      skills: { select: { skill: { select: { id: true, name: true } } } },
      vehicles: { select: { id: true, vehicleType: true, isAvailable: true } },
      assignments: {
        where: { status: { in: [...activeAssignmentStatuses] } },
        select: { id: true, emergencyRequestId: true },
      },
    },
  });

  return profiles.flatMap((profile) => {
    const activeAssignmentCount = profile.assignments.length;
    if (
      activeAssignmentCount >= MAX_ACTIVE_ASSIGNMENTS
      || profile.assignments.some((assignment) => assignment.emergencyRequestId === emergencyRequestId)
    ) return [];

    const skillNames = profile.skills.map(({ skill }) => skill.name);
    const matchedSkills = requiredSkills.filter((required) => skillNames.includes(required));
    if (requiredSkills.length > 0 && matchedSkills.length === 0) return [];

    const matchingReasons = ['Verified responder', 'Available'];
    matchedSkills.forEach((skill) => matchingReasons.push(`${skill.replace(/_/g, ' ')} skill matches emergency`));

    const availableVehicles = profile.vehicles.filter((vehicle) => vehicle.isAvailable);
    if (emergency.emergencyType === 'FLOOD' && availableVehicles.some((vehicle) => vehicle.vehicleType === VehicleType.BOAT)) {
      matchingReasons.push('Has boat capability');
    }
    if (emergency.emergencyType === 'MEDICAL' && availableVehicles.some((vehicle) => vehicle.vehicleType === VehicleType.AMBULANCE)) {
      matchingReasons.push('Has ambulance capability');
    }

    return [{
      responderProfileId: profile.id,
      name: profile.user.name,
      role: profile.user.role,
      availabilityStatus: profile.availabilityStatus,
      isVerified: profile.isVerified,
      skills: profile.skills.map(({ skill }) => skill),
      vehicles: profile.vehicles,
      locationText: profile.locationText,
      activeAssignmentCount,
      matchingReasons,
    }];
  });
}

export async function assignResponder(
  emergencyRequestIdInput: string,
  responderProfileIdInput: string,
  assignedById: string,
) {
  const emergencyRequestId = normalizeId(emergencyRequestIdInput, 'emergency request id');
  const responderProfileId = normalizeId(responderProfileIdInput, 'responder profile id');
  const assignerId = normalizeId(assignedById, 'assigner id');

  try {
    return await withSerializableRetry(() => prisma.$transaction(async (transaction) => {
      const emergency = await transaction.emergencyRequest.findUnique({
        where: { id: emergencyRequestId },
        select: { id: true, status: true, assignedResponderId: true },
      });
      if (!emergency) throw new HttpError(404, 'Emergency request not found');
      if (emergency.status === EmergencyStatus.RESOLVED || emergency.status === EmergencyStatus.CANCELLED) {
        throw new HttpError(400, 'Cannot assign a responder to a resolved or cancelled emergency');
      }

      const profile = await transaction.responderProfile.findUnique({
        where: { id: responderProfileId },
        select: { id: true, userId: true, isVerified: true, availabilityStatus: true, user: { select: { isActive: true, role: true } } },
      });
      if (!profile) throw new HttpError(404, 'Responder profile not found');
      if (profile.user.role !== 'VOLUNTEER' && profile.user.role !== 'RESPONDER') {
        throw new HttpError(400, 'Profile owner must be a volunteer or responder');
      }
      if (!profile.user.isActive) throw new HttpError(400, 'Responder account is inactive');
      if (!profile.isVerified) throw new HttpError(400, 'Responder profile is not verified');
      if (profile.availabilityStatus === AvailabilityStatus.OFFLINE || profile.availabilityStatus === AvailabilityStatus.UNAVAILABLE) {
        throw new HttpError(400, 'Responder is not available for assignment');
      }

      const existing = await transaction.responderAssignment.findFirst({
        where: { emergencyRequestId, responderProfileId, status: { in: [...activeAssignmentStatuses] } },
        select: { id: true },
      });
      if (existing) throw new HttpError(409, 'Responder is already actively assigned to this emergency');

      const activeCount = await transaction.responderAssignment.count({
        where: { responderProfileId, status: { in: [...activeAssignmentStatuses] } },
      });
      if (activeCount >= MAX_ACTIVE_ASSIGNMENTS) throw new HttpError(409, 'Responder has too many active assignments');

      const assignment = await transaction.responderAssignment.create({
        data: { emergencyRequestId, responderProfileId, assignedById: assignerId, status: ResponderAssignmentStatus.ASSIGNED },
        select: assignmentSelect,
      });

      if (emergency.status === EmergencyStatus.REPORTED || emergency.status === EmergencyStatus.VERIFIED) {
        await transaction.emergencyRequest.update({
          where: { id: emergencyRequestId },
          data: { status: EmergencyStatus.ASSIGNED, assignedResponderId: profile.userId },
        });
      } else if (!emergency.assignedResponderId) {
        await transaction.emergencyRequest.update({ where: { id: emergencyRequestId }, data: { assignedResponderId: profile.userId } });
      }

      return assignment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'Responder is already actively assigned to this emergency');
    }
    throw error;
  }
}

function ensureAssignmentOwner(assignment: { responderProfile: { user: { id: string } } }, actorId: string): void {
  if (assignment.responderProfile.user.id !== normalizeId(actorId, 'user id')) throw new HttpError(403, 'Forbidden');
}

export async function acceptAssignment(idInput: string, actorId: string) {
  const id = normalizeId(idInput, 'assignment id');
  const actorUserId = normalizeId(actorId, 'user id');

  return withSerializableRetry(() => prisma.$transaction(async (transaction) => {
    const assignment = await transaction.responderAssignment.findUnique({ where: { id }, select: assignmentSelect });
    if (!assignment) throw new HttpError(404, 'Responder assignment not found');
    ensureAssignmentOwner(assignment, actorUserId);
    if (assignment.status !== ResponderAssignmentStatus.ASSIGNED) throw new HttpError(400, 'Only an assigned assignment can be accepted');

    const user = await transaction.user.findUnique({ where: { id: actorUserId }, select: { isActive: true } });
    if (!user?.isActive) throw new HttpError(400, 'Responder account is inactive');

    return transaction.responderAssignment.update({
      where: { id: assignment.id },
      data: { status: ResponderAssignmentStatus.ACCEPTED, acceptedAt: new Date() },
      select: assignmentSelect,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

async function changeAssignmentState(idInput: string, actorId: string, nextStatus: ResponderAssignmentStatus) {
  const id = normalizeId(idInput, 'assignment id');
  const actorUserId = normalizeId(actorId, 'user id');

  return withSerializableRetry(() => prisma.$transaction(async (transaction) => {
    const assignment = await transaction.responderAssignment.findUnique({ where: { id }, select: assignmentSelect });
    if (!assignment) throw new HttpError(404, 'Responder assignment not found');

    const actor = await transaction.user.findUnique({ where: { id: actorUserId }, select: { role: true, isActive: true } });
    if (!actor) throw new HttpError(401, 'Authentication required');
    if (!actor.isActive) throw new HttpError(403, 'Inactive users cannot manage assignments');

    const isManager = actor.role === 'COORDINATOR' || actor.role === 'ADMIN';
    if (!isManager) ensureAssignmentOwner(assignment, actorUserId);

    const expectedStatus = nextStatus === ResponderAssignmentStatus.IN_PROGRESS
      ? ResponderAssignmentStatus.ACCEPTED
      : ResponderAssignmentStatus.IN_PROGRESS;
    if (assignment.status !== expectedStatus) {
      const action = nextStatus === ResponderAssignmentStatus.IN_PROGRESS ? 'started' : 'completed';
      throw new HttpError(400, `Only an ${expectedStatus.toLowerCase().replace('_', '-')} assignment can be ${action}`);
    }

    const data: Prisma.ResponderAssignmentUpdateInput = { status: nextStatus };
    if (nextStatus === ResponderAssignmentStatus.IN_PROGRESS) data.startedAt = new Date();
    if (nextStatus === ResponderAssignmentStatus.COMPLETED) data.completedAt = new Date();
    return transaction.responderAssignment.update({ where: { id: assignment.id }, data, select: assignmentSelect });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export function startAssignment(id: string, actorId: string) {
  return changeAssignmentState(id, actorId, ResponderAssignmentStatus.IN_PROGRESS);
}

export function completeAssignment(id: string, actorId: string) {
  return changeAssignmentState(id, actorId, ResponderAssignmentStatus.COMPLETED);
}

export async function cancelAssignment(idInput: string, actorId: string) {
  const id = normalizeId(idInput, 'assignment id');
  const actorUserId = normalizeId(actorId, 'user id');

  return withSerializableRetry(() => prisma.$transaction(async (transaction) => {
    const assignment = await transaction.responderAssignment.findUnique({ where: { id }, select: assignmentSelect });
    if (!assignment) throw new HttpError(404, 'Responder assignment not found');

    const actor = await transaction.user.findUnique({ where: { id: actorUserId }, select: { role: true, isActive: true } });
    if (!actor) throw new HttpError(401, 'Authentication required');
    if (!actor.isActive) throw new HttpError(403, 'Inactive users cannot manage assignments');
    if (actor.role !== 'COORDINATOR' && actor.role !== 'ADMIN') ensureAssignmentOwner(assignment, actorUserId);
    if (!isActiveAssignment(assignment.status)) throw new HttpError(400, 'Only an active assignment can be cancelled');

    const updated = await transaction.responderAssignment.update({
      where: { id },
      data: { status: ResponderAssignmentStatus.CANCELLED, cancelledAt: new Date() },
      select: assignmentSelect,
    });
    const remaining = await transaction.responderAssignment.count({
      where: { emergencyRequestId: assignment.emergencyRequestId, status: { in: [...activeAssignmentStatuses] } },
    });
    if (remaining === 0) {
      await transaction.emergencyRequest.updateMany({
        where: { id: assignment.emergencyRequestId, status: EmergencyStatus.ASSIGNED },
        data: { assignedResponderId: null, status: EmergencyStatus.VERIFIED },
      });
    }
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function listAssignments(filters: { status?: unknown; emergencyRequestId?: unknown; responderProfileId?: unknown }, page: number, limit: number, actorId: string, actorRole: string) {
  const where: Prisma.ResponderAssignmentWhereInput = {};
  const status = readStatus(filters.status);
  if (status) where.status = status;
  if (typeof filters.emergencyRequestId !== 'undefined') where.emergencyRequestId = normalizeId(filters.emergencyRequestId, 'emergency request id');
  if (typeof filters.responderProfileId !== 'undefined') where.responderProfileId = normalizeId(filters.responderProfileId, 'responder profile id');
  if (actorRole === 'RESPONDER') where.responderProfile = { userId: normalizeId(actorId, 'user id') };

  const [total, assignments] = await Promise.all([
    prisma.responderAssignment.count({ where }),
    prisma.responderAssignment.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit, select: assignmentSelect }),
  ]);
  return { assignments, pagination: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) } };
}

export async function listEmergencyAssignments(emergencyRequestIdInput: string, actorId: string, actorRole: string) {
  const emergencyRequestId = normalizeId(emergencyRequestIdInput, 'emergency request id');
  const emergency = await prisma.emergencyRequest.findUnique({ where: { id: emergencyRequestId }, select: { id: true } });
  if (!emergency) throw new HttpError(404, 'Emergency request not found');
  if (actorRole === 'RESPONDER') {
    const profileId = await getProfileIdForUser(actorId);
    const owns = await prisma.responderAssignment.findFirst({ where: { emergencyRequestId, responderProfileId: profileId }, select: { id: true } });
    if (!owns) throw new HttpError(403, 'Forbidden');
  }
  return prisma.responderAssignment.findMany({ where: { emergencyRequestId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: emergencyResponderSelect });
}

export async function listMyAssignments(userId: string) {
  const profileId = await getProfileIdForUser(userId);
  return prisma.responderAssignment.findMany({
    where: { responderProfileId: profileId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: assignmentSelect,
  });
}
