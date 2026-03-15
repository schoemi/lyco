export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
  role: "ADMIN" | "USER";
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
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
}
