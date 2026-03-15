import { NextResponse } from "next/server";
import { isSetupRequired } from "@/lib/services/setup-service";

export async function GET() {
  try {
    const required = await isSetupRequired();
    return NextResponse.json({ required });
  } catch (error) {
    console.error("Setup status error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
