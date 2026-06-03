import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSsoConfig } from "@/lib/config/auth-env";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const ssoAccount = await prisma.ssoAccount.findFirst({
      where: { userId: session.user.id },
    });

    const ssoConfigured = getSsoConfig() !== null;

    if (ssoAccount) {
      return NextResponse.json({
        linked: true,
        provider: ssoAccount.provider.charAt(0).toUpperCase() + ssoAccount.provider.slice(1),
        ssoConfigured,
      });
    }

    return NextResponse.json({ linked: false, ssoConfigured });
  } catch (error) {
    console.error("GET /api/auth/sso/link-status error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
