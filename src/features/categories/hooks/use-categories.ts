"use client"

import { useState, useCallback } from "react"
import { get, post, patch, del } from "@/lib/api"
import type { ContentCategory, CreateCategoryRequest, UpdateCategoryRequest, CategoryQueryParams } from "../types"
import { useAuth } from "@/contexts/auth-context"

export function useCategories() {
  const { token } = useAuth()
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async (params: CategoryQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const queryParams: Record<string, string | boolean | undefined> = {}
      if (params.layer) queryParams.layer = params.layer
      if (params.parentCode !== undefined) queryParams.parentCode = params.parentCode ?? ''
      if (params.isActive !== undefined) queryParams.isActive = params.isActive

      const response = await get<{ data: ContentCategory[], total: number }>("/v1/categories", {
        params: queryParams,
        token: token ?? undefined,
      })
      const rawData = response.data as { data?: ContentCategory[], total?: number }
      const categoriesData = Array.isArray(rawData) ? rawData : (rawData?.data || [])
      setCategories(categoriesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch categories")
    } finally {
      setLoading(false)
    }
  }, [token])

  return { categories, loading, error, fetchCategories }
}

export function useCategoryCreate() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCategory = useCallback(async (data: CreateCategoryRequest): Promise<ContentCategory> => {
    setLoading(true)
    setError(null)
    try {
      const response = await post<ContentCategory>("/v1/categories", data, token ?? undefined)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create category"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  return { createCategory, loading, error }
}

export function useCategoryUpdate() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryRequest): Promise<ContentCategory> => {
    setLoading(true)
    setError(null)
    try {
      const response = await patch<ContentCategory>(`/v1/categories/${id}`, data, token ?? undefined)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update category"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  return { updateCategory, loading, error }
}

export function useCategoryDelete() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await del(`/v1/categories/${id}`, token ?? undefined)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete category"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  return { deleteCategory, loading, error }
}