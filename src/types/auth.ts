export type AccountStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
  role: "ADMIN" | "USER";
  accountStatus?: AccountStatus;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: "ADMIN" | "USER";
}

export interface SetupInput {
  email: string;
  name: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  accountStatus: AccountStatus;
}

export interface StatusChangeInput {
  status: "ACTIVE" | "SUSPENDED";
}

export interface SystemSettingResponse {
  key: string;
  value: string;
}
