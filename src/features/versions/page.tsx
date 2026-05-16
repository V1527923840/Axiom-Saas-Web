"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns } from "./components/columns"
import { fileColumns } from "./components/file-columns"
import { useVersionsStore } from "./hooks/use-versions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"

export default function VersionsPage() {
  const {
    versions,
    loading,
    selectedSource,
    selectedVersion,
    versionFiles,
    filesLoading,
    fetchVersions,
    fetchVersionFiles,
    setSelectedSource,
    setSelectedVersion,
    resetSelection,
  } = useVersionsStore()

  const [sourceFilter, setSourceFilter] = useState<string>("all")

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  // Get unique sources from versions
  const sources = [...new Set(versions.map(v => v.source))]

  // Get versions for selected source (show all if no source selected)
  const filteredVersions = selectedSource
    ? versions.filter(v => v.source === selectedSource)
    : versions

  const handleSourceFilterChange = (value: string) => {
    setSourceFilter(value)
    resetSelection()
    if (value === "all") {
      fetchVersions()
    } else {
      fetchVersions({ source: value })
    }
  }

  const handleVersionRowClick = (version: string, source: string) => {
    setSelectedSource(source)
    setSelectedVersion(version)
    fetchVersionFiles(source, version)
  }

  const handleRefresh = () => {
    resetSelection()
    if (sourceFilter === "all") {
      fetchVersions()
    } else {
      fetchVersions({ source: sourceFilter })
    }
  }

  return (
    <BaseLayout title="版本管理" description="管理文档版本和文件">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">数据源</Label>
            <Select
              value={sourceFilter}
              onValueChange={handleSourceFilterChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部数据源" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部数据源</SelectItem>
                {sources.map(source => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleRefresh} className="cursor-pointer">
            <RefreshCw className="size-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* Versions Table */}
        <DataTable
          columns={columns}
          data={filteredVersions}
          loading={loading}
          showToolbar={false}
          onRowClick={(version) => handleVersionRowClick(version.version, version.source)}
        />

        {/* Files Section */}
        {selectedVersion && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                文件列表 - {selectedSource} / {selectedVersion}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={fileColumns}
                data={versionFiles}
                loading={filesLoading}
                showToolbar={false}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </BaseLayout>
  )
}