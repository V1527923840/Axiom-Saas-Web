import { z } from "zod"

// API Response types
export interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  pageSize?: number
  message?: string
}

export interface ApiError {
  message: string
  code: string
  statusCode: number
}

// Custom error classes
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ApiRequestError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode: number, code: string = "API_ERROR") {
    super(message)
    this.name = "ApiRequestError"
    this.statusCode = statusCode
    this.code = code
  }
}

// Response schema for validation
const apiResponseSchema = z.object({
  data: z.unknown(),
  total: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  message: z.string().optional(),
})

// Backend response envelope pattern
// Some endpoints return { success: true, data: {...} } wrapper
// This needs to be unwrapped for consistent access
interface WrappedResponse {
  success?: boolean
  data?: unknown
  [key: string]: unknown
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"

// Request options interface
interface RequestOptions {
  token?: string
  params?: Record<string, string | number | boolean | undefined>
}

// Auto-inject auth token from localStorage if available and no explicit token provided
function getAuthToken(explicitToken?: string): string | undefined {
  if (explicitToken) return explicitToken
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token") || undefined
  }
  return undefined
}

// Build query string from params
function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
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

// Auto-unwrap backend response if it has { success: true, data: {...} } pattern
function unwrapResponse<T>(json: unknown): ApiResponse<T> {
  const wrapped = json as WrappedResponse

  // If response has { success: true, data: {...} } pattern, unwrap it
  // This handles inconsistent response formats across modules
  if (wrapped.success === true && wrapped.data !== undefined) {
    // The 'data' field contains the actual response
    const actualData = wrapped.data as Record<string, unknown>
    return {
      data: actualData as T,
      total: wrapped.total as number,
      page: wrapped.page as number,
      pageSize: wrapped.pageSize as number,
      message: wrapped.message as string,
    }
  }

  // Standard case - no unwrap needed
  return json as ApiResponse<T>
}

// Generic fetch with error handling
async function request<T>(
  endpoint: string,
  options: RequestInit & RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { token, params, ...fetchOptions } = options

  // Auto-inject auth token if not explicitly provided
  const authToken = token || getAuthToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const queryString = buildQueryString(params)
  const url = `${API_BASE_URL}${endpoint}${queryString}`

  let response: Response
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    })
  } catch (error) {
    throw new ApiRequestError("Network error", 0, "NETWORK_ERROR")
  }

  // Handle error responses
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    let errorCode = "API_ERROR"

    const contentType = response.headers.get("content-type")
    if (contentType?.includes("application/json")) {
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
        errorCode = errorData.code || errorCode
      } catch {
        // JSON parse failed, use default message
      }
    }

    if (response.status === 401) {
      // Clear auth tokens and redirect to sign-in
      localStorage.removeItem("auth_token")
      localStorage.removeItem("auth_refresh_token")
      window.location.href = "/auth/sign-in"
      throw new UnauthorizedError(errorMessage)
    }

    const error = new ApiRequestError(errorMessage, response.status, errorCode)
    throw error
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as ApiResponse<T>
  }

  // Parse and validate response
  try {
    const json = await response.json()

    // Validate response structure with Zod
    const validated = apiResponseSchema.parse(json)
    // Auto-unwrap if response has { success, data } pattern
    return unwrapResponse<T>(validated)
  } catch (zodError) {
    if (zodError instanceof z.ZodError) {
      throw new ApiRequestError("Invalid response format", 500, "VALIDATION_ERROR")
    }
    throw zodError
  }
}

// Overloaded GET function to support both:
// - get<T>(endpoint: string, options?: RequestOptions)
// - get<T>(endpoint: string, token: string) // backward compatible
export async function get<T>(
  endpoint: string,
  options?: RequestOptions | string
): Promise<ApiResponse<T>> {
  if (typeof options === "string") {
    // Old style: get(endpoint, token)
    return request<T>(endpoint, { method: "GET", token: options })
  }
  return request<T>(endpoint, { method: "GET", ...options })
}

// POST function with data and optional options
export async function post<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions | string
): Promise<ApiResponse<T>> {
  if (typeof options === "string") {
    // Old style: post(endpoint, data, token)
    return request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
      token: options,
    })
  }
  return request<T>(endpoint, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  })
}

// PUT function
export async function put<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions | string
): Promise<ApiResponse<T>> {
  if (typeof options === "string") {
    return request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
      token: options,
    })
  }
  return request<T>(endpoint, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  })
}

// PATCH function
export async function patch<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions | string
): Promise<ApiResponse<T>> {
  if (typeof options === "string") {
    return request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
      token: options,
    })
  }
  return request<T>(endpoint, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  })
}

// DELETE function
export async function del<T>(
  endpoint: string,
  options?: RequestOptions | string
): Promise<ApiResponse<T>> {
  if (typeof options === "string") {
    return request<T>(endpoint, { method: "DELETE", token: options })
  }
  return request<T>(endpoint, { method: "DELETE", ...options })
}

// CRUD factory function for common operations
export function createCrudApi<T>(
  endpoint: string,
  options: RequestOptions = {}
) {
  return {
    getAll: (params?: Record<string, string | number | boolean | undefined>) =>
      get<T[]>(endpoint, { ...options, params }),

    getOne: (id: string) =>
      get<T>(`${endpoint}/${id}`, options),

    create: (data: unknown) =>
      post<T>(endpoint, data, options),

    update: (id: string, data: unknown) =>
      put<T>(`${endpoint}/${id}`, data, options),

    patch: (id: string, data: unknown) =>
      patch<T>(`${endpoint}/${id}`, data, options),

    delete: (id: string) =>
      del<T>(`${endpoint}/${id}`, options),
  }
}

export { API_BASE_URL }