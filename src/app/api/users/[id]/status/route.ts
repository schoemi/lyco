import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { suspendUser, activateUser } from "@/lib/services/user-service";

async function getAdminSession() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (status !== "ACTIVE" && status !== "SUSPENDED") {
      return NextResponse.json(
        { error: "Ungültiger Kontostatus" },
        { status: 400 }
      );
    }

    let user;
    if (status === "SUSPENDED") {
      const requestingUserId = result.session!.user.id;
      user = await suspendUser(id, requestingUserId);
    } else {
      user = await activateUser(id);
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Eigenes Konto kann nicht gesperrt werden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message === "Benutzer nicht gefunden") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("PATCH /api/users/[id]/status error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
