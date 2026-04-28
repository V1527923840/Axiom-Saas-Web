import { get, post } from "@/lib/api"

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: { id: number; name: string }
  status: { id: number; name: string }
}

export interface LoginResponse {
  token: string
  refreshToken: string
  tokenExpires: number
  user: User
}

export interface SignupResponse {
  // Returns 204 on success, so empty
}

export const authApi = {
  login: (email: string, password: string) =>
    post<LoginResponse>("/v1/auth/email/login", { email, password }),

  register: (firstName: string, lastName: string, email: string, password: string) =>
    post<SignupResponse>("/v1/auth/email/register", {
      firstName,
      lastName,
      email,
      password,
    }),

  getMe: (token: string) => get<User>("/v1/auth/me", token),

  refresh: (refreshToken: string) =>
    post<LoginResponse>("/v1/auth/refresh", {}, refreshToken),

  logout: (token: string) => post<void>("/v1/auth/logout", {}, token),
}