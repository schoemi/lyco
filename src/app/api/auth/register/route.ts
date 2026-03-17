import { NextRequest, NextResponse } from "next/server";
import { validateEmail, validatePassword, hashPassword } from "@/lib/services/auth-service";
import { isEmailTaken, createUser } from "@/lib/services/user-service";
import { getRequireApproval } from "@/lib/services/system-setting-service";

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

    // Check if approval is required for new registrations
    const requireApproval = await getRequireApproval();

    // Create user with role USER and appropriate account status
    const user = await createUser({
      email,
      name: name ?? undefined,
      password,
      role: "USER",
      ...(requireApproval && { accountStatus: "PENDING" }),
    });

    if (requireApproval) {
      return NextResponse.json(
        {
          user,
          message: "Ihre Registrierung war erfolgreich. Ihr Konto muss noch von einem Administrator bestätigt werden.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
