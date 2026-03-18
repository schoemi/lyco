import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  validatePassword,
  hashPassword,
} from "@/lib/services/auth-service";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/genius/api-key-store";
import type {
  ProfileData,
  UpdateProfileInput,
  ChangePasswordInput,
} from "@/types/profile";

const VALID_GESCHLECHT = ["MAENNLICH", "WEIBLICH", "DIVERS"] as const;
const VALID_ERFAHRUNGSLEVEL = [
  "ANFAENGER",
  "FORTGESCHRITTEN",
  "ERFAHREN",
  "PROFI",
] as const;

const profileSelect = {
  id: true,
  name: true,
  email: true,
  alter: true,
  geschlecht: true,
  erfahrungslevel: true,
  stimmlage: true,
  genre: true,
  sprache: true,
  geniusApiKeyEncrypted: true,
} as const;

export async function getProfile(userId: string): Promise<ProfileData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });

  if (!user) {
    throw new Error("Benutzer nicht gefunden");
  }

  let geniusApiKeyMasked: string | null = null;
  if (user.geniusApiKeyEncrypted) {
    try {
      const plaintext = decryptApiKey(user.geniusApiKeyEncrypted);
      geniusApiKeyMasked = maskApiKey(plaintext);
    } catch {
      // If decryption fails (corrupted data), treat as no key
      geniusApiKeyMasked = null;
    }
  }

  const { geniusApiKeyEncrypted: _, ...rest } = user;
  return { ...rest, geniusApiKeyMasked } as ProfileData;
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<ProfileData> {
  // Validate name
  if (data.name !== undefined) {
    if (typeof data.name !== "string" || data.name.trim().length === 0) {
      throw new Error("Name darf nicht leer sein");
    }
    if (data.name.length > 100) {
      throw new Error("Name darf maximal 100 Zeichen lang sein");
    }
  }

  // Validate alter
  if (data.alter !== undefined && data.alter !== null) {
    if (!Number.isInteger(data.alter) || data.alter < 1 || data.alter > 120) {
      throw new Error("Alter muss eine Ganzzahl zwischen 1 und 120 sein");
    }
  }

  // Validate geschlecht
  if (data.geschlecht !== undefined && data.geschlecht !== null) {
    if (
      !VALID_GESCHLECHT.includes(
        data.geschlecht as (typeof VALID_GESCHLECHT)[number]
      )
    ) {
      throw new Error(
        "Geschlecht muss MAENNLICH, WEIBLICH oder DIVERS sein"
      );
    }
  }

  // Validate erfahrungslevel
  if (data.erfahrungslevel !== undefined && data.erfahrungslevel !== null) {
    if (
      !VALID_ERFAHRUNGSLEVEL.includes(
        data.erfahrungslevel as (typeof VALID_ERFAHRUNGSLEVEL)[number]
      )
    ) {
      throw new Error(
        "Erfahrungslevel muss ANFAENGER, FORTGESCHRITTEN, ERFAHREN oder PROFI sein"
      );
    }
  }

  // Handle geniusApiKey: encrypt non-empty, null for empty
  let geniusApiKeyData: { geniusApiKeyEncrypted: string | null } | undefined;
  if (data.geniusApiKey !== undefined) {
    if (data.geniusApiKey.trim().length > 0) {
      geniusApiKeyData = {
        geniusApiKeyEncrypted: encryptApiKey(data.geniusApiKey),
      };
    } else {
      geniusApiKeyData = { geniusApiKeyEncrypted: null };
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.alter !== undefined && { alter: data.alter }),
      ...(data.geschlecht !== undefined && { geschlecht: data.geschlecht }),
      ...(data.erfahrungslevel !== undefined && {
        erfahrungslevel: data.erfahrungslevel,
      }),
      ...(data.stimmlage !== undefined && { stimmlage: data.stimmlage }),
      ...(data.genre !== undefined && { genre: data.genre }),
      ...(data.sprache !== undefined && { sprache: data.sprache }),
      ...geniusApiKeyData,
    },
    select: profileSelect,
  });

  let geniusApiKeyMasked: string | null = null;
  if (user.geniusApiKeyEncrypted) {
    try {
      const plaintext = decryptApiKey(user.geniusApiKeyEncrypted);
      geniusApiKeyMasked = maskApiKey(plaintext);
    } catch {
      geniusApiKeyMasked = null;
    }
  }

  const { geniusApiKeyEncrypted: _, ...rest } = user;
  return { ...rest, geniusApiKeyMasked } as ProfileData;
}

export async function changePassword(
  userId: string,
  data: ChangePasswordInput
): Promise<void> {
  // Load user with password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new Error("Benutzer nicht gefunden");
  }

  // Verify current password
  const isValid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error("Aktuelles Passwort ist falsch");
  }

  // Check new password matches confirmation
  if (data.newPassword !== data.confirmPassword) {
    throw new Error("Passwörter stimmen nicht überein");
  }

  // Validate new password
  const validation = validatePassword(data.newPassword);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Hash and save new password
  const passwordHash = await hashPassword(data.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
