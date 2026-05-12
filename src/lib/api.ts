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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"

// Request options interface
interface RequestOptions {
  token?: string
  params?: Record<string, string | number | boolean | undefined>
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

// Generic fetch with error handling
async function request<T>(
  endpoint: string,
  options: RequestInit & RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { token, params, ...fetchOptions } = options

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
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
    return validated as ApiResponse<T>
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