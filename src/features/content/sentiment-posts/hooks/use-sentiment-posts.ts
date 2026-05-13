"use client"

import { create } from 'zustand'
import { useState } from 'react'
import { contentApi } from "@/services/content"
import type { SentimentPostItem, SentimentPostsQueryParams } from "../types"

interface SentimentPostsState {
  posts: SentimentPostItem[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  selectedItem: SentimentPostItem | null
  detailDialogOpen: boolean

  fetchPosts: (params?: SentimentPostsQueryParams) => Promise<void>
  getPost: (id: string) => Promise<SentimentPostItem | null>
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  openDetail: (item: SentimentPostItem) => void
  closeDetail: () => void
}

export const useSentimentPostsStore = create<SentimentPostsState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,
  pagination: {
    page: 0,
    pageSize: 10,
    total: 0,
  },
  selectedItem: null,
  detailDialogOpen: false,

  fetchPosts: async (params: SentimentPostsQueryParams = {}) => {
    set({ loading: true, error: null })
    try {
      const { pagination } = get()
      const page = (params.page ?? pagination.page) + 1
      const pageSize = params.pageSize ?? pagination.pageSize

      const response = await contentApi.getSentimentPosts(page, pageSize, {
        sentiment: params.sentiment,
        company: params.company,
        keyword: params.keyword,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      })

      set({
        posts: response.data,
        pagination: {
          page: response.page,
          pageSize: response.pageSize,
          total: response.total,
        },
        loading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch posts",
        loading: false,
      })
    }
  },

  getPost: async (id: string) => {
    set({ loading: true, error: null })
    try {
      // For getting a single post, we need to use direct API call
      const { get } = await import("@/lib/api")
      const response = await get<SentimentPostItem>(`/v1/content/sentiment-posts/${id}`)
      return response.data
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to get post",
        loading: false,
      })
      return null
    } finally {
      set({ loading: false })
    }
  },

  setPage: (page) => {
    set(state => ({
      pagination: { ...state.pagination, page }
    }))
    get().fetchPosts()
  },

  setPageSize: (pageSize) => {
    set(state => ({
      pagination: { ...state.pagination, pageSize, page: 0 }
    }))
    get().fetchPosts()
  },

  openDetail: (item) => set({ selectedItem: item, detailDialogOpen: true }),
  closeDetail: () => set({ selectedItem: null, detailDialogOpen: false }),
}))

// Post filters hook - exported separately
export function usePostFilters() {
  const [filters, setFilters] = useState({
    sentiment: null as 'positive' | 'negative' | 'neutral' | null,
    company: "",
    keyword: "",
    dateFrom: "",
    dateTo: "",
  })

  const setSentiment = (sentiment: 'positive' | 'negative' | 'neutral' | null) => {
    setFilters((prev) => ({ ...prev, sentiment }))
  }

  const setCompany = (company: string) => {
    setFilters((prev) => ({ ...prev, company }))
  }

  const setKeyword = (keyword: string) => {
    setFilters((prev) => ({ ...prev, keyword }))
  }

  const setDateFrom = (dateFrom: string) => {
    setFilters((prev) => ({ ...prev, dateFrom }))
  }

  const setDateTo = (dateTo: string) => {
    setFilters((prev) => ({ ...prev, dateTo }))
  }

  const resetFilters = () => {
    setFilters({
      sentiment: null,
      company: "",
      keyword: "",
      dateFrom: "",
      dateTo: "",
    })
  }

  return {
    filters,
    setSentiment,
    setCompany,
    setKeyword,
    setDateFrom,
    setDateTo,
    resetFilters,
  }
}

// Backward compatibility - re-export store as hook with the same interface
export function useSentimentPosts() {
  return useSentimentPostsStore()
}