import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getRequireApproval,
  setRequireApproval,
} from "@/lib/services/system-setting-service";
import { logAudit, SETTING_CHANGED } from "@/lib/services/log-service";
import { getClientIp } from "@/lib/utils/request-ip";

async function getAdminSession() {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      ),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function GET() {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const value = await getRequireApproval();
    return NextResponse.json({ value });
  } catch (error) {
    console.error("GET /api/settings/require-approval error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const body = await request.json();
    const { value } = body;

    if (typeof value !== "boolean") {
      return NextResponse.json(
        { error: "Ungültiger Wert für Bestätigungspflicht" },
        { status: 400 }
      );
    }

    await setRequireApproval(value);

    // Fire-and-forget audit log
    logAudit({
      action: SETTING_CHANGED,
      actorId: result.session!.user!.id,
      targetEntity: "SystemSetting",
      targetId: "require-approval",
      details: { key: "require-approval", value },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ value });
  } catch (error) {
    console.error("PUT /api/settings/require-approval error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
