import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSsoAutoCreateAccounts,
  setSsoAutoCreateAccounts,
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

    const autoCreateAccounts = await getSsoAutoCreateAccounts();
    return NextResponse.json({ autoCreateAccounts });
  } catch (error) {
    console.error("GET /api/settings/sso error:", error);
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
    const { autoCreateAccounts } = body;

    if (typeof autoCreateAccounts !== "boolean") {
      return NextResponse.json(
        { error: "Ungültiger Wert für automatische Kontoerstellung" },
        { status: 400 }
      );
    }

    await setSsoAutoCreateAccounts(autoCreateAccounts);

    // Fire-and-forget audit log
    logAudit({
      action: SETTING_CHANGED,
      actorId: result.session!.user!.id,
      targetEntity: "SystemSetting",
      targetId: "sso-auto-create-accounts",
      details: { key: "sso-auto-create-accounts", value: autoCreateAccounts },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ autoCreateAccounts });
  } catch (error) {
    console.error("PUT /api/settings/sso error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
