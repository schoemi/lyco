import { NextRequest, NextResponse } from "next/server";
import { validateEmail, validatePassword, hashPassword } from "@/lib/services/auth-service";
import { isEmailTaken, createUser } from "@/lib/services/user-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    // Validate email
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Ungültige E-Mail-Adresse", field: "email" },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password ?? "");
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error, field: "password" },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const emailTaken = await isEmailTaken(email);
    if (emailTaken) {
      return NextResponse.json(
        { error: "E-Mail bereits vergeben", field: "email" },
        { status: 409 }
      );
    }

    // Create user with role USER
    const user = await createUser({
      email,
      name: name ?? undefined,
      password,
      role: "USER",
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
