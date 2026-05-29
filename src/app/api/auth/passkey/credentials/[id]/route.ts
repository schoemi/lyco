import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deletePasskey } from "@/lib/services/passkey-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { id } = await params;

    await deletePasskey(session.user.id, id);
    return NextResponse.json({ message: "Passkey gelöscht" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Passkey nicht gefunden") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Passkey gehört nicht zu diesem Benutzer") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("DELETE /api/auth/passkey/credentials/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
