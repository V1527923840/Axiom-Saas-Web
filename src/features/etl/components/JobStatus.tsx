"use client"

import { Badge } from "@/components/ui/badge"
import type { EtlJobStatus } from "../types"

interface JobStatusProps {
  status: EtlJobStatus
}

const statusConfig: Record<EtlJobStatus, { label: string; className: string }> = {
  pending: { label: "等待中", className: "bg-gray-100 text-gray-800" },
  processing: { label: "处理中", className: "bg-blue-100 text-blue-800" },
  completed: { label: "已完成", className: "bg-green-100 text-green-800" },
  failed: { label: "失败", className: "bg-red-100 text-red-800" },
}

export function JobStatus({ status }: JobStatusProps) {
  const config = statusConfig[status] || statusConfig.pending
  return <Badge className={config.className}>{config.label}</Badge>
}