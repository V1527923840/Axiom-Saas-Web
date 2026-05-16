"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { parseTaskApi } from "../services/parse-task"
import type { ParseTaskDetail } from "../types"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ArrowLeft, Play, RefreshCw } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const statusConfig = {
  pending: { label: "待处理", variant: "secondary" as const },
  running: { label: "执行中", variant: "default" as const },
  success: { label: "成功", variant: "outline" as const },
  partial: { label: "部分成功", variant: "secondary" as const },
  failed: { label: "失败", variant: "destructive" as const },
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-"
  try {
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })
  } catch {
    return dateStr
  }
}

export default function ParseTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<ParseTaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail(taskId)
    }
  }, [taskId])

  const fetchTaskDetail = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await parseTaskApi.getTask(id)
      setTask(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch task")
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!taskId) return
    setExecuting(true)
    try {
      await parseTaskApi.executeTask(taskId)
      await fetchTaskDetail(taskId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute task")
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return (
      <BaseLayout title="任务详情" description="查看解析任务详情">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </BaseLayout>
    )
  }

  if (error || !task) {
    return (
      <BaseLayout title="任务详情" description="查看解析任务详情">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-red-500">{error || "Task not found"}</p>
          <Button onClick={() => navigate("/parse/tasks")} className="cursor-pointer">
            <ArrowLeft className="size-4 mr-2" />
            返回列表
          </Button>
        </div>
      </BaseLayout>
    )
  }

  const statusInfo = statusConfig[task.status as keyof typeof statusConfig]

  // Build timeline events
  const timeline = [
    { label: "创建", time: task.created_at, status: "completed" as const },
    { label: "开始", time: task.started_at, status: task.started_at ? "completed" as const : "pending" as const },
    { label: "完成", time: task.completed_at, status: task.completed_at ? "completed" as const : "pending" as const },
  ]

  return (
    <BaseLayout title="任务详情" description="查看解析任务详情">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/parse/tasks")}
              className="cursor-pointer"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">任务详情</h1>
              <p className="text-sm text-muted-foreground font-mono">{task.task_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {task.status === "pending" && (
              <Button
                onClick={handleExecute}
                disabled={executing}
                className="cursor-pointer"
              >
                {executing ? (
                  <>
                    <LoadingSpinner className="size-4 mr-2" />
                    执行中...
                  </>
                ) : (
                  <>
                    <Play className="size-4 mr-2" />
                    执行
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => fetchTaskDetail(taskId!)}
              variant="outline"
              className="cursor-pointer"
            >
              <RefreshCw className="size-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">数据源</span>
                <p className="font-medium">{task.source}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">版本</span>
                <p className="font-mono text-sm">{task.version}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">解析器</span>
                <p className="font-medium">{task.parser || "-"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">重试次数</span>
                <p className="font-medium">{task.retry_count ?? 0}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">条目数</span>
                <p className="font-medium">{task.entry_count ?? "-"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">置信度</span>
                <p className="font-medium">
                  {task.confidence !== undefined ? `${(task.confidence * 100).toFixed(1)}%` : "-"}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">解析耗时</span>
                <p className="font-medium">
                  {task.parse_duration_ms ? `${(task.parse_duration_ms / 1000).toFixed(2)}s` : "-"}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">源文件名</span>
                <p className="font-mono text-xs truncate" title={task.source_filename}>
                  {task.source_filename || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">执行时间线</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {timeline.map((event, index) => (
                <div key={event.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        event.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-sm mt-1">{event.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.time)}
                    </span>
                  </div>
                  {index < timeline.length - 1 && (
                    <div
                      className={`w-20 h-0.5 mx-2 ${
                        timeline[index + 1].status === "completed"
                          ? "bg-green-500"
                          : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* File Paths */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">文件路径</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">源文件</span>
                <p className="font-mono text-xs break-all">{task.source_file_key || "-"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">JSON 输出</span>
                <p className="font-mono text-xs break-all">{task.output_json_key || "-"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">MD 输出</span>
                <p className="font-mono text-xs break-all">{task.output_md_key || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {task.error_message && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base text-red-600">错误信息</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 bg-red-50 p-3 rounded text-sm">
                {task.error_message}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </BaseLayout>
  )
}