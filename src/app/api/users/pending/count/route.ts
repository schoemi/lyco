import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPendingCount } from "@/lib/services/user-service";

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

export async function GET() {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const count = await getPendingCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/users/pending/count error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
