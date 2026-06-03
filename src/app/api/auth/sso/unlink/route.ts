/**
 * UnlinkHandler — DELETE /api/auth/sso/unlink
 *
 * Hebt die SSO-Verknüpfung des eingeloggten Users auf, indem alle SsoAccount-
 * Einträge des Users gelöscht werden. Schreibt anschließend einen Audit-Log-Eintrag.
 *
 * Requirements: 3.1–3.6
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, SSO_UNLINK_SUCCESS } from "@/lib/services/log-service";

export async function DELETE(): Promise<Response> {
  // 1. Auth-Check → 401 wenn kein User in der Session (Requirement 3.5)
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  // 2. Prüfen ob SsoAccounts für den User existieren → 0 → 404 (Requirement 3.4)
  const count = await prisma.ssoAccount.count({ where: { userId } });
  if (count === 0) {
    return NextResponse.json(
      { error: "Keine SSO-Verknüpfung vorhanden" },
      { status: 404 }
    );
  }

  // 3. Provider-Liste für den Audit-Log holen (vor dem Löschen)
  const accounts = await prisma.ssoAccount.findMany({
    where: { userId },
    select: { provider: true },
  });
  const providers = accounts.map((a) => a.provider);

  // 4. Alle SsoAccounts des Users löschen → DB-Fehler → 500 (Requirements 3.1, 3.6)
  try {
    await prisma.ssoAccount.deleteMany({ where: { userId } });
  } catch (error) {
    console.error("SSO Unlink fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler beim Aufheben der SSO-Verknüpfung" },
      { status: 500 }
    );
  }

  // 5. Audit-Log schreiben (Requirement 3.3)
  await logAudit({
    action: SSO_UNLINK_SUCCESS,
    actorId: userId,
    details: { providers },
  });

  // 6. 200 { unlinked: true } (Requirement 3.2)
  return NextResponse.json({ unlinked: true });
}
