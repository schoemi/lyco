import { prisma } from "@/lib/prisma";

const REQUIRE_APPROVAL_KEY = "require-approval";
const SSO_AUTO_CREATE_KEY = "sso-auto-create-accounts";

export async function getRequireApproval(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: REQUIRE_APPROVAL_KEY },
  });

  if (!setting) {
    return false;
  }

  return setting.value === "true";
}

export async function setRequireApproval(value: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: REQUIRE_APPROVAL_KEY },
    update: { value: String(value) },
    create: { key: REQUIRE_APPROVAL_KEY, value: String(value) },
  });
}

/**
 * Returns whether automatic account creation on SSO login is enabled.
 * Default: false (accounts must be pre-created by an admin).
 */
export async function getSsoAutoCreateAccounts(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: SSO_AUTO_CREATE_KEY },
  });

  if (!setting) {
    return false;
  }

  return setting.value === "true";
}

/**
 * Sets the SSO auto-create accounts setting.
 */
export async function setSsoAutoCreateAccounts(value: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: SSO_AUTO_CREATE_KEY },
    update: { value: String(value) },
    create: { key: SSO_AUTO_CREATE_KEY, value: String(value) },
  });
}
