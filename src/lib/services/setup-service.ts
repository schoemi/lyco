import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  validateEmail,
  validatePassword,
} from "@/lib/services/auth-service";
import type { SetupInput } from "../../types/auth";

const userSelectWithoutPassword = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function isSetupRequired(): Promise<boolean> {
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });
  return adminCount === 0;
}

export async function createInitialAdmin(data: SetupInput) {
  const setupRequired = await isSetupRequired();
  if (!setupRequired) {
    throw new Error("Setup wurde bereits abgeschlossen");
  }

  if (!validateEmail(data.email)) {
    throw new Error("Ungültige E-Mail-Adresse");
  }

  const passwordCheck = validatePassword(data.password);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.error!);
  }

  const passwordHash = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: "ADMIN",
    },
    select: userSelectWithoutPassword,
  });
}
