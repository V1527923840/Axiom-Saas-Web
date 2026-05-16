"use client"

import { create } from 'zustand'
import { versionsApi } from "../services/versions"
import type { VersionItem, VersionFile } from "../types"

interface VersionsState {
  versions: VersionItem[]
  loading: boolean
  error: string | null
  selectedSource: string
  selectedVersion: string
  versionFiles: VersionFile[]
  filesLoading: boolean

  fetchVersions: (params?: { source?: string }) => Promise<void>
  fetchVersionFiles: (source: string, version: string) => Promise<void>
  setSelectedSource: (source: string) => void
  setSelectedVersion: (version: string) => void
  resetSelection: () => void
}

export const useVersionsStore = create<VersionsState>((set) => ({
  versions: [],
  loading: false,
  error: null,
  selectedSource: "",
  selectedVersion: "",
  versionFiles: [],
  filesLoading: false,

  fetchVersions: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const response = await versionsApi.getVersions(params)
      set({ versions: response.versions, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch versions",
        loading: false,
      })
    }
  },

  fetchVersionFiles: async (source: string, version: string) => {
    set({ filesLoading: true, error: null })
    try {
      const response = await versionsApi.getVersionFiles(source, version)
      set({ versionFiles: response.files, filesLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch version files",
        loading: false,
      })
    }
  },

  setSelectedSource: (source) => {
    set({ selectedSource: source, selectedVersion: "", versionFiles: [] })
  },

  setSelectedVersion: (version) => {
    set({ selectedVersion: version })
  },

  resetSelection: () => {
    set({ selectedSource: "", selectedVersion: "", versionFiles: [] })
  },
}))