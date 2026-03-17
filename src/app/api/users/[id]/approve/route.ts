import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { approveUser } from "@/lib/services/user-service";

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const { id } = await params;
    const user = await approveUser(id);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Benutzer nicht gefunden") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("POST /api/users/[id]/approve error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
