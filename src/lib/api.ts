const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"

interface ApiError extends Error {
  status: number
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type")
    let errorMessage = `HTTP error! status: ${response.status}`

    if (contentType?.includes("application/json")) {
      const errorData = await response.json()
      errorMessage = errorData.message || errorData.error || errorMessage
    }

    if (response.status === 401) {
      const error = new UnauthorizedError(errorMessage) as ApiError
      error.status = 401
      throw error
    }

    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export async function get<T>(endpoint: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers,
  })
  return handleResponse<T>(response)
}

export async function post<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  })
  return handleResponse<T>(response)
}

export async function patch<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  })
  return handleResponse<T>(response)
}

export async function del<T>(endpoint: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers,
  })
  return handleResponse<T>(response)
}

export { API_BASE_URL }