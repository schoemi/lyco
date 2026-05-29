import { DefaultSession } from "next-auth";
import { AccountStatus } from "./auth";
import { AuthMethod } from "@/lib/types/auth-extensions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "USER";
      accountStatus: AccountStatus;
      authMethod?: AuthMethod;
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "USER";
    accountStatus: AccountStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "USER";
    accountStatus: AccountStatus;
    rememberMe?: boolean;
    authMethod?: AuthMethod;
  }
}
