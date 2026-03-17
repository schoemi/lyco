import { prisma } from "@/lib/prisma";

const REQUIRE_APPROVAL_KEY = "require-approval";

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
