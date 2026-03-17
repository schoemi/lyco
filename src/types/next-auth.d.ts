import { DefaultSession } from "next-auth";
import { AccountStatus } from "./auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "USER";
      accountStatus: AccountStatus;
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
  }
}
