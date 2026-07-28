// src/features/industry-chain/types/index.ts

export interface L1Item {
  code: string
  name: string
  chainCount: number
}

export interface L2Item {
  code: string
  name: string
  chainCount: number
}

export interface ChainItem {
  slug: string
  name: string
  createTime: string
  versionCount: number
}

export interface VersionItem {
  id: number
  version: number
  createTime: string
  qiniuUrl: string
}