import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUsers, createUser } from "@/lib/services/user-service";
import {
  validateEmail,
  validatePassword,
} from "@/lib/services/auth-service";

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

    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const body = await request.json();
    const { email, name, password, role } = body;

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Ungültige E-Mail-Adresse", field: "email" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password ?? "");
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error, field: "password" },
        { status: 400 }
      );
    }

    if (role && role !== "ADMIN" && role !== "USER") {
      return NextResponse.json(
        { error: "Ungültige Rolle", field: "role" },
        { status: 400 }
      );
    }

    const user = await createUser({
      email,
      name: name ?? undefined,
      password,
      role: role ?? "USER",
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "E-Mail bereits vergeben") {
      return NextResponse.json(
        { error: "E-Mail bereits vergeben", field: "email" },
        { status: 409 }
      );
    }
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
