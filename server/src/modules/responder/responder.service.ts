import {
  AvailabilityStatus,
  Prisma,
  VehicleType,
} from '@prisma/client';

import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';

const profileSelect = {
  id: true,
  userId: true,
  phone: true,
  organization: true,
  designation: true,
  bio: true,
  availabilityStatus: true,
  latitude: true,
  longitude: true,
  locationText: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  skills: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      createdAt: true,
      skill: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  },
  vehicles: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      vehicleType: true,
      vehicleNumber: true,
      capacity: true,
      isAvailable: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

const skillSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

const vehicleSelect = {
  id: true,
  profileId: true,
  vehicleType: true,
  vehicleNumber: true,
  capacity: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ProfileInput = {
  phone?: unknown;
  organization?: unknown;
  designation?: unknown;
  bio?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  locationText?: unknown;
};

type ProfileFields = {
  phone?: string | null;
  organization?: string | null;
  designation?: string | null;
  bio?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationText?: string | null;
};

function normalizeId(value: unknown, fieldName: string): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }

  return value;
}

function readOptionalText(value: unknown, fieldName: string): string | null | undefined {
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

function readCoordinate(value: unknown, fieldName: 'latitude' | 'longitude'): number | null | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HttpError(400, `${fieldName} must be a valid number or null`);
  }

  const limit = fieldName === 'latitude' ? 90 : 180;

  if (value < -limit || value > limit) {
    throw new HttpError(400, `${fieldName} must be between ${-limit} and ${limit}`);
  }

  return value;
}

function readEnum<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
  fieldName: string,
): T[keyof T] {
  if (typeof value !== 'string' || !Object.values(enumObject).includes(value as T[keyof T])) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }

  return value as T[keyof T];
}

function readBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new HttpError(400, `${fieldName} must be a boolean`);
  }

  return value;
}

function readFilterBoolean(value: unknown, fieldName: string): boolean {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  throw new HttpError(400, `${fieldName} must be true or false`);
}

function readCapacity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new HttpError(400, 'capacity must be a non-negative integer');
  }

  return value;
}

function readVehicleNumber(value: unknown): string | null | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, 'vehicleNumber must be a non-empty string or null');
  }

  return value.trim();
}

function normalizeSkillName(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, 'Skill name is required');
  }

  return value.trim().replace(/\s+/g, '_').toUpperCase();
}

function serializeProfile(profile: Prisma.ResponderProfileGetPayload<{ select: typeof profileSelect }>) {
  return {
    ...profile,
    skills: profile.skills.map(({ skill, createdAt }) => ({
      ...skill,
      addedAt: createdAt,
    })),
  };
}

function buildProfileData(input: ProfileInput): ProfileFields {
  const data: ProfileFields = {};
  const phone = readOptionalText(input.phone, 'phone');
  const organization = readOptionalText(input.organization, 'organization');
  const designation = readOptionalText(input.designation, 'designation');
  const bio = readOptionalText(input.bio, 'bio');
  const locationText = readOptionalText(input.locationText, 'locationText');
  const latitude = readCoordinate(input.latitude, 'latitude');
  const longitude = readCoordinate(input.longitude, 'longitude');

  if (phone !== undefined) data.phone = phone;
  if (organization !== undefined) data.organization = organization;
  if (designation !== undefined) data.designation = designation;
  if (bio !== undefined) data.bio = bio;
  if (locationText !== undefined) data.locationText = locationText;
  if (latitude !== undefined) data.latitude = latitude;
  if (longitude !== undefined) data.longitude = longitude;

  return data;
}

async function getProfileRecordById(id: string) {
  return prisma.responderProfile.findUnique({
    where: { id: normalizeId(id, 'profile id') },
    select: profileSelect,
  });
}

async function getProfileRecordByUserId(userId: string) {
  return prisma.responderProfile.findUnique({
    where: { userId: normalizeId(userId, 'user id') },
    select: profileSelect,
  });
}

export async function createProfile(input: ProfileInput, userId: string) {
  try {
    const profile = await prisma.responderProfile.create({
      data: {
        user: { connect: { id: normalizeId(userId, 'user id') } },
        ...buildProfileData(input),
      },
      select: profileSelect,
    });

    return serializeProfile(profile);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new HttpError(409, 'Responder profile already exists');
      }

      if (error.code === 'P2025') {
        throw new HttpError(404, 'User not found');
      }
    }

    throw error;
  }
}

export async function updateVerification(id: string, isVerified: boolean) {
  try {
    return await prisma.responderProfile.update({
      where: { id: normalizeId(id, 'profile id') },
      data: { isVerified },
      select: { id: true, isVerified: true, updatedAt: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Responder profile not found');
    }

    throw error;
  }
}

export async function getMyProfile(userId: string) {
  const profile = await getProfileRecordByUserId(userId);

  if (!profile) {
    throw new HttpError(404, 'Responder profile not found');
  }

  return serializeProfile(profile);
}

export async function getProfile(id: string) {
  const profile = await getProfileRecordById(id);

  if (!profile) {
    throw new HttpError(404, 'Responder profile not found');
  }

  return serializeProfile(profile);
}

export async function updateMyProfile(input: ProfileInput, userId: string) {
  const normalizedUserId = normalizeId(userId, 'user id');

  try {
    const profile = await prisma.responderProfile.update({
      where: { userId: normalizedUserId },
      data: buildProfileData(input),
      select: profileSelect,
    });

    return serializeProfile(profile);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Responder profile not found');
    }

    throw error;
  }
}

export async function deleteMyProfile(userId: string): Promise<void> {
  const normalizedUserId = normalizeId(userId, 'user id');

  try {
    await prisma.$transaction(async (transaction) => {
      const profile = await transaction.responderProfile.findUnique({
        where: { userId: normalizedUserId },
        select: { id: true },
      });

      if (!profile) {
        throw new HttpError(404, 'Responder profile not found');
      }

      await transaction.responderProfileSkill.deleteMany({ where: { profileId: profile.id } });
      await transaction.responderVehicle.deleteMany({ where: { profileId: profile.id } });
      await transaction.responderProfile.delete({ where: { id: profile.id } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new HttpError(409, 'Responder profile cannot be deleted while related records exist');
    }

    throw error;
  }
}

export async function updateAvailability(userId: string, value: unknown) {
  const availabilityStatus = readEnum(AvailabilityStatus, value, 'availability status');

  try {
    return await prisma.responderProfile.update({
      where: { userId: normalizeId(userId, 'user id') },
      data: { availabilityStatus },
      select: { id: true, availabilityStatus: true, updatedAt: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Responder profile not found');
    }

    throw error;
  }
}

export async function getAvailability(userId: string) {
  const profile = await prisma.responderProfile.findUnique({
    where: { userId: normalizeId(userId, 'user id') },
    select: { id: true, availabilityStatus: true, updatedAt: true },
  });

  if (!profile) {
    throw new HttpError(404, 'Responder profile not found');
  }

  return profile;
}

export async function listProfiles(filters: {
  availabilityStatus?: unknown;
  isVerified?: unknown;
  organization?: unknown;
  skill?: unknown;
  vehicleAvailable?: unknown;
}, page: number, limit: number) {
  const where: Prisma.ResponderProfileWhereInput = {};

  if (typeof filters.availabilityStatus !== 'undefined') {
    where.availabilityStatus = readEnum(AvailabilityStatus, filters.availabilityStatus, 'availability status filter');
  }

  if (typeof filters.isVerified !== 'undefined') {
    where.isVerified = readFilterBoolean(filters.isVerified, 'isVerified filter');
  }

  if (typeof filters.organization !== 'undefined') {
    if (typeof filters.organization !== 'string' || filters.organization.trim() === '') {
      throw new HttpError(400, 'organization filter is invalid');
    }
    where.organization = { contains: filters.organization.trim(), mode: 'insensitive' };
  }

  if (typeof filters.skill !== 'undefined') {
    const skillId = normalizeId(filters.skill, 'skill id');
    where.skills = { some: { skillId } };
  }

  if (typeof filters.vehicleAvailable !== 'undefined') {
    where.vehicles = { some: { isAvailable: readFilterBoolean(filters.vehicleAvailable, 'vehicle availability filter') } };
  }

  const [total, profiles] = await Promise.all([
    prisma.responderProfile.count({ where }),
    prisma.responderProfile.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: profileSelect,
    }),
  ]);

  return {
    profiles: profiles.map(serializeProfile),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function listSkills() {
  return prisma.responderSkill.findMany({ orderBy: { name: 'asc' }, select: skillSelect });
}

export async function createSkill(nameInput: unknown, descriptionInput: unknown) {
  const name = normalizeSkillName(nameInput);
  const description = readOptionalText(descriptionInput, 'description');
  const data: Prisma.ResponderSkillCreateInput = { name };

  if (description !== undefined) data.description = description;

  try {
    return await prisma.responderSkill.create({
      data,
      select: skillSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'Skill already exists');
    }

    throw error;
  }
}

export async function updateSkill(id: string, nameInput: unknown, descriptionInput: unknown) {
  const data: Prisma.ResponderSkillUpdateInput = {};

  if (typeof nameInput !== 'undefined') data.name = normalizeSkillName(nameInput);
  if (typeof descriptionInput !== 'undefined') {
    const description = readOptionalText(descriptionInput, 'description');
    if (description !== undefined) data.description = description;
  }

  try {
    return await prisma.responderSkill.update({
      where: { id: normalizeId(id, 'skill id') },
      data,
      select: skillSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new HttpError(409, 'Skill already exists');
      if (error.code === 'P2025') throw new HttpError(404, 'Skill not found');
    }

    throw error;
  }
}

export async function deleteSkill(id: string): Promise<void> {
  const skillId = normalizeId(id, 'skill id');
  const assignedCount = await prisma.responderProfileSkill.count({ where: { skillId } });

  if (assignedCount > 0) {
    throw new HttpError(409, 'Skill cannot be deleted while assigned to profiles');
  }

  try {
    await prisma.responderSkill.delete({ where: { id: skillId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Skill not found');
    }

    throw error;
  }
}

async function getOwnProfileId(userId: string): Promise<string> {
  const profile = await prisma.responderProfile.findUnique({
    where: { userId: normalizeId(userId, 'user id') },
    select: { id: true },
  });

  if (!profile) {
    throw new HttpError(404, 'Responder profile not found');
  }

  return profile.id;
}

export async function addSkillToMyProfile(userId: string, skillIdInput: string) {
  const profileId = await getOwnProfileId(userId);
  const skillId = normalizeId(skillIdInput, 'skill id');
  const skill = await prisma.responderSkill.findUnique({ where: { id: skillId }, select: { id: true } });

  if (!skill) {
    throw new HttpError(404, 'Skill not found');
  }

  try {
    await prisma.responderProfileSkill.create({ data: { profileId, skillId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'Skill is already assigned to this profile');
    }

    throw error;
  }

  return getMyProfile(userId);
}

export async function removeSkillFromMyProfile(userId: string, skillIdInput: string) {
  const profileId = await getOwnProfileId(userId);
  const skillId = normalizeId(skillIdInput, 'skill id');
  await prisma.responderProfileSkill.deleteMany({ where: { profileId, skillId } });
  return getMyProfile(userId);
}

export async function listMyVehicles(userId: string) {
  const profileId = await getOwnProfileId(userId);
  return prisma.responderVehicle.findMany({
    where: { profileId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: vehicleSelect,
  });
}

function buildVehicleData(input: { vehicleType?: unknown; vehicleNumber?: unknown; capacity?: unknown; isAvailable?: unknown }) {
  const vehicleType = readEnum(VehicleType, input.vehicleType, 'vehicle type');
  const vehicleNumber = readVehicleNumber(input.vehicleNumber);
  const capacity = readCapacity(input.capacity);
  const isAvailable = typeof input.isAvailable === 'undefined' ? true : readBoolean(input.isAvailable, 'isAvailable');

  const data: Omit<Prisma.ResponderVehicleUncheckedCreateInput, 'profileId'> = {
    vehicleType,
    capacity,
    isAvailable,
  };

  if (vehicleNumber !== undefined) data.vehicleNumber = vehicleNumber;

  return data;
}

export async function createMyVehicle(userId: string, input: { vehicleType?: unknown; vehicleNumber?: unknown; capacity?: unknown; isAvailable?: unknown }) {
  const profileId = await getOwnProfileId(userId);
  return prisma.responderVehicle.create({
    data: { profileId, ...buildVehicleData(input) },
    select: vehicleSelect,
  });
}

export async function updateMyVehicle(userId: string, vehicleIdInput: string, input: { vehicleType?: unknown; vehicleNumber?: unknown; capacity?: unknown; isAvailable?: unknown }) {
  const profileId = await getOwnProfileId(userId);
  const vehicleId = normalizeId(vehicleIdInput, 'vehicle id');
  const existing = await prisma.responderVehicle.findFirst({ where: { id: vehicleId, profileId }, select: { id: true } });

  if (!existing) {
    throw new HttpError(404, 'Vehicle not found');
  }

  const data: Prisma.ResponderVehicleUpdateInput = {};
  if (typeof input.vehicleType !== 'undefined') data.vehicleType = readEnum(VehicleType, input.vehicleType, 'vehicle type');
  if (typeof input.vehicleNumber !== 'undefined') {
    const vehicleNumber = readVehicleNumber(input.vehicleNumber);
    if (vehicleNumber !== undefined) data.vehicleNumber = vehicleNumber;
  }
  if (typeof input.capacity !== 'undefined') data.capacity = readCapacity(input.capacity);
  if (typeof input.isAvailable !== 'undefined') data.isAvailable = readBoolean(input.isAvailable, 'isAvailable');

  return prisma.responderVehicle.update({ where: { id: vehicleId }, data, select: vehicleSelect });
}

export async function deleteMyVehicle(userId: string, vehicleIdInput: string): Promise<void> {
  const profileId = await getOwnProfileId(userId);
  const vehicleId = normalizeId(vehicleIdInput, 'vehicle id');
  const result = await prisma.responderVehicle.deleteMany({ where: { id: vehicleId, profileId } });

  if (result.count === 0) {
    throw new HttpError(404, 'Vehicle not found');
  }
}