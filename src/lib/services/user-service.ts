import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/services/auth-service";
import { AccountStatus } from "@/generated/prisma/client";
import type { CreateUserInput, UpdateUserInput } from "../../types/auth";

const userSelectWithoutPassword = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers() {
  return prisma.user.findMany({
    select: userSelectWithoutPassword,
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userSelectWithoutPassword,
  });
}

export async function isEmailTaken(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return user !== null;
}

export async function createUser(data: CreateUserInput) {
  const taken = await isEmailTaken(data.email);
  if (taken) {
    throw new Error("E-Mail bereits vergeben");
  }

  const passwordHash = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name ?? null,
      passwordHash,
      role: data.role,
      ...(data.accountStatus !== undefined && { accountStatus: data.accountStatus }),
    },
    select: userSelectWithoutPassword,
  });
}

export async function updateUser(id: string, data: UpdateUserInput) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Benutzer nicht gefunden");
  }

  if (data.email && data.email !== existing.email) {
    const taken = await isEmailTaken(data.email);
    if (taken) {
      throw new Error("E-Mail bereits vergeben");
    }
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.email !== undefined && { email: data.email }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.role !== undefined && { role: data.role }),
    },
    select: userSelectWithoutPassword,
  });
}

export async function deleteUser(
  id: string,
  requestingUserId: string
): Promise<void> {
  if (id === requestingUserId) {
    throw new Error("Eigenen Account kann nicht gelöscht werden");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Benutzer nicht gefunden");
  }

  await prisma.user.delete({ where: { id } });
}

export async function resetPassword(id: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Benutzer nicht gefunden");
  }

  const temporaryPassword = crypto.randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(temporaryPassword);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  return temporaryPassword;
}

export async function suspendUser(id: string, requestingUserId: string) {
  if (id === requestingUserId) {
    throw new Error("Eigenes Konto kann nicht gesperrt werden");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Benutzer nicht gefunden");
  }

  return prisma.user.update({
    where: { id },
    data: { accountStatus: AccountStatus.SUSPENDED },
    select: userSelectWithoutPassword,
  });
}

export async function activateUser(id: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Benutzer nicht gefunden");
  }

  return prisma.user.update({
    where: { id },
    data: { accountStatus: AccountStatus.ACTIVE },
    select: userSelectWithoutPassword,
  });
}

export async function approveUser(id: string) {
  return activateUser(id);
}

export async function rejectUser(id: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Benutzer nicht gefunden");
  }

  if (existing.accountStatus !== AccountStatus.PENDING) {
    throw new Error("Nur ausstehende Benutzer können abgelehnt werden");
  }

  await prisma.user.delete({ where: { id } });
}

export async function getPendingCount(): Promise<number> {
  return prisma.user.count({
    where: { accountStatus: AccountStatus.PENDING },
  });
}

export async function getUserAccountStatus(id: string): Promise<AccountStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { accountStatus: true },
  });
  return user?.accountStatus ?? null;
}
