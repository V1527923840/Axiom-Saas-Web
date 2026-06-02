"use client"

import { useState, useCallback } from "react"
import type { CategoryL1, ValueRating } from "../types"

export interface IntelligenceFiltersState {
  categoryL1: CategoryL1 | null
  categoryL2: string
  valueRating: ValueRating | null
  title: string
  dateRange: { from: Date; to: Date } | undefined
}

export function useIntelligenceFilters() {
  const [filters, setFilters] = useState<IntelligenceFiltersState>({
    categoryL1: null,
    categoryL2: "",
    valueRating: null,
    title: "",
    dateRange: undefined,
  })

  const setCategoryL1 = useCallback((categoryL1: CategoryL1 | null) => {
    setFilters((prev) => ({
      ...prev,
      categoryL1,
      categoryL2: "", // Reset categoryL2 when categoryL1 changes
    }))
  }, [])

  const setCategoryL2 = useCallback((categoryL2: string) => {
    setFilters((prev) => ({ ...prev, categoryL2 }))
  }, [])

  const setValueRating = useCallback((valueRating: ValueRating | null) => {
    setFilters((prev) => ({ ...prev, valueRating }))
  }, [])

  const setTitle = useCallback((title: string) => {
    setFilters((prev) => ({ ...prev, title }))
  }, [])

  const setDateRange = useCallback((dateRange: { from: Date; to: Date } | undefined) => {
    setFilters((prev) => ({ ...prev, dateRange }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      categoryL1: null,
      categoryL2: "",
      valueRating: null,
      title: "",
      dateRange: undefined,
    })
  }, [])

  return {
    filters,
    setCategoryL1,
    setCategoryL2,
    setValueRating,
    setTitle,
    setDateRange,
    resetFilters,
  }
}