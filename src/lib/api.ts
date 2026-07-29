// src/lib/api.ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"

export type ApiResponse<T> = {
  data: T
  meta?: PaginationMeta
}

// TODO: replace with components["schemas"]["PaginationMetaDto"] from
// src/types/api.d.ts once the server emits it under that name.
export interface PaginationMeta {
  total?: number
  page?: number
  pageSize?: number
  hasNextPage?: boolean
}

export class ApiRequestError extends Error {
  statusCode: number
  code: string
  constructor(message: string, statusCode: number, code = "API_ERROR") {
    super(message)
    this.name = "ApiRequestError"
    this.statusCode = statusCode
    this.code = code
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

interface RequestOptions {
  token?: string
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
}

function getAuthToken(explicitToken?: string): string | undefined {
  if (explicitToken) return explicitToken
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token") || undefined
  }
  return undefined
}

function buildQueryString(
  params?: Record<string, string | number | boolean | undefined>,
): string {
  if (!params) return ""
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

async function request<T>(
  endpoint: string,
  options: RequestInit & RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { token, params, body, ...fetchOptions } = options
  const authToken = token || getAuthToken()

  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const url = `${API_BASE_URL}${endpoint}${buildQueryString(params)}`

  let response: Response
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body !== undefined ? (JSON.stringify(body) as BodyInit) : undefined,
    })
  } catch {
    throw new ApiRequestError("Network error", 0, "NETWORK_ERROR")
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    let errorCode = "API_ERROR"
    if (response.headers.get("content-type")?.includes("application/json")) {
      try {
        const errorData = await response.json()
        // NestJS validation errors use { status, errors: { field: msg } }.
        // Other NestJS exceptions can also surface as { statusCode, message, error }.
        // Fall back through several known shapes before using the generic default.
        const nested = errorData?.errors
        if (nested && typeof nested === "object") {
          const details = Object.entries(nested)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join("; ")
          if (details) errorMessage = details
        } else if (typeof errorData?.message === "string") {
          errorMessage = errorData.message
        } else if (typeof errorData?.error === "string") {
          errorMessage = errorData.error
        }
        if (typeof errorData?.code === "string") errorCode = errorData.code
      } catch {
        /* fall through */
      }
    }
    if (response.status === 401) {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("auth_refresh_token")
      window.location.href = "/auth/sign-in"
      throw new UnauthorizedError(errorMessage)
    }
    throw new ApiRequestError(errorMessage, response.status, errorCode)
  }

  if (response.status === 204) {
    return {} as ApiResponse<T>
  }

  const json = await response.json()
  // Single envelope: { data, meta?, message? }. No auto-unwrap needed.
  return json as ApiResponse<T>
}

export async function get<T>(
  endpoint: string,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "GET", ...(options as RequestInit & RequestOptions | undefined) })
}

export async function post<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "POST", body: data as BodyInit | null | undefined, ...(options as RequestInit & RequestOptions | undefined) })
}

export async function put<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "PUT", body: data as BodyInit | null | undefined, ...(options as RequestInit & RequestOptions | undefined) })
}

export async function patch<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "PATCH", body: data as BodyInit | null | undefined, ...(options as RequestInit & RequestOptions | undefined) })
}

export async function del<T>(
  endpoint: string,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "DELETE", ...(options as RequestInit & RequestOptions | undefined) })
}

export function createCrudApi<T>(
  endpoint: string,
  options: RequestOptions = {},
) {
  return {
    getAll: (params?: Record<string, string | number | boolean | undefined>) =>
      get<T[]>(endpoint, { ...options, params }),
    getOne: (id: string) => get<T>(`${endpoint}/${id}`, options),
    create: (data: unknown) => post<T>(endpoint, data, options),
    update: (id: string, data: unknown) =>
      put<T>(`${endpoint}/${id}`, data, options),
    patch: (id: string, data: unknown) =>
      patch<T>(`${endpoint}/${id}`, data, options),
    delete: (id: string) => del<T>(`${endpoint}/${id}`, options),
  }
}

export { API_BASE_URL }