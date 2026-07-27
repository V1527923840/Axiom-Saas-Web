// src/services/auth.ts
import { get, post } from "@/lib/api"
import type { components } from "@/types/api"

type UserDto = components["schemas"]["User"]
type LoginResponseDto = components["schemas"]["LoginResponseDto"]

export type User = UserDto

export interface LoginResponse {
  token: string
  refreshToken: string
  tokenExpires: number
  user: UserDto
}

export const authApi = {
  login: (email: string, password: string) =>
    post<LoginResponseDto>("/v1/auth/email/login", { email, password }),

  register: (firstName: string, lastName: string, email: string, password: string) =>
    post<void>("/v1/auth/email/register", { firstName, lastName, email, password }),

  getMe: (token: string) => get<UserDto>("/v1/auth/me", { token }),

  refresh: (refreshToken: string) =>
    post<LoginResponseDto>("/v1/auth/refresh", {}, { token: refreshToken }),

  logout: (token: string) =>
    post<void>("/v1/auth/logout", {}, { token }),
}