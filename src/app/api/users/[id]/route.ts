import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUser, deleteUser } from "@/lib/services/user-service";
import { validateEmail } from "@/lib/services/auth-service";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const { id } = await params;
    const body = await request.json();
    const { email, name, role } = body;

    if (email !== undefined && !validateEmail(email)) {
      return NextResponse.json(
        { error: "Ungültige E-Mail-Adresse", field: "email" },
        { status: 400 }
      );
    }

    if (role !== undefined && role !== "ADMIN" && role !== "USER") {
      return NextResponse.json(
        { error: "Ungültige Rolle", field: "role" },
        { status: 400 }
      );
    }

    const user = await updateUser(id, { email, name, role });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Benutzer nicht gefunden") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "E-Mail bereits vergeben") {
        return NextResponse.json(
          { error: error.message, field: "email" },
          { status: 409 }
        );
      }
    }
    console.error("PUT /api/users/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const { id } = await params;
    const requestingUserId = result.session!.user.id;

    await deleteUser(id, requestingUserId);
    return NextResponse.json({ message: "Benutzer gelöscht" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Eigenen Account kann nicht gelöscht werden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message === "Benutzer nicht gefunden") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
