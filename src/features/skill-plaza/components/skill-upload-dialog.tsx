/**
 * SkillUploadDialog — 2 Tab 上传弹窗 (md / zip)。
 *
 * Phase 0 (本地):选择文件 → normalize → 算 hash
 * Phase 1 (server):申请 uploadUrl
 * Phase 1.5 (browser → Qiniu):PUT 上传
 * Phase 2 (server):确认上传
 *
 * 通过 useSkillUpload hook 驱动。
 */
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, UploadCloud } from "lucide-react"
import { useSkillUpload } from "../hooks/use-skill-upload"
import type { UploadSourceFormat } from "../types"
import { FrontmatterPreview } from "./skill-frontmatter-preview"
import { parseSkillMd } from "../lib/frontmatter"
import { PREDEFINED_CATEGORIES } from "../lib/categories"

interface SkillUploadDialogProps {
  trigger?: React.ReactNode
  onSuccess?: (skillId: string) => void
  // ★ 受控开关 — 由父组件管理 open 状态(适配 /skills 广场按钮直接弹窗)
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SkillUploadDialog({
  trigger,
  onSuccess,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: SkillUploadDialogProps) {
  const [openInternal, setOpenInternal] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : openInternal
  const setOpen = (v: boolean) => {
    if (!isControlled) setOpenInternal(v)
    onOpenChangeProp?.(v)
  }
  const [format, setFormat] = useState<UploadSourceFormat>("md")
  const [file, setFile] = useState<File | null>(null)
  const [previewMd, setPreviewMd] = useState<string>("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [changelog, setChangelog] = useState("")
  const [category, setCategory] = useState<string>("")

  const upload = useSkillUpload({
    onSuccess: (r) => {
      onSuccess?.(r.skillId)
      setOpen(false)
      resetForm()
    },
  })

  function resetForm() {
    setFile(null)
    setPreviewMd("")
    setCode("")
    setName("")
    setDescription("")
    setCategory("")
    setChangelog("")
    upload.reset()
  }

  async function onPickFile(picked: File | null) {
    setFile(picked)
    if (!picked) {
      setPreviewMd("")
      return
    }
    if (picked.name.endsWith(".md")) {
      const text = await picked.text()
      setPreviewMd(text)
      try {
        const parsed = parseSkillMd(text)
        setCode((picked.name.replace(/\.md$/, "")))
        if (!name) setName(parsed.frontmatter.name)
        if (!description) setDescription(parsed.frontmatter.description)
      } catch {
        // frontmatter 错误由后端 Phase 2 拦
      }
    } else {
      setPreviewMd("")
    }
  }

  async function onSubmit() {
    if (!file) return
    try {
      await upload.mutateAsync({
        file,
        format,
        code,
        name,
        description,
        changelog: changelog || undefined,
        category: category || undefined,
      })
    } catch (e) {
      // 错误显示在下面
    }
  }

  const progressLabel = ["", "本地打包…", "上传七牛云…", "确认…"][upload.progress] ?? ""
  const inFlight = upload.progress > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) resetForm()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <UploadCloud className="mr-2 h-4 w-4" />
            上传 Skill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>上传 Skill</DialogTitle>
          <DialogDescription>
            选择一个 .md 文档或完整 .zip,后端会打包校验后发布。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={format} onValueChange={(v) => setFormat(v as UploadSourceFormat)}>
          <TabsList>
            <TabsTrigger value="md">单 .md</TabsTrigger>
            <TabsTrigger value="zip">Zip 目录</TabsTrigger>
          </TabsList>
          <TabsContent value="md" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              选单个 .md 文件,客户端会自动包成 zip(含 SKILL.md + 空 files/)。
            </p>
          </TabsContent>
          <TabsContent value="zip" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              上传预先整理好的目录(含 SKILL.md + files/ + files/tools/)。
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label>文件</Label>
          <Input
            type="file"
            accept={format === "md" ? ".md" : ".zip,application/zip"}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            disabled={inFlight}
          />
          {file && (
            <p className="text-xs text-muted-foreground">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {previewMd && <FrontmatterPreview md={previewMd} />}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>code</Label>
            <Input
              placeholder="financial-report-basic"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={inFlight}
            />
          </div>
          <div className="space-y-2">
            <Label>name</Label>
            <Input
              placeholder="财报基础"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={inFlight}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>description</Label>
          <Textarea
            placeholder="skill 用途简述,会被 AI 用于自动匹配"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={inFlight}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="选择预设分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">不使用预设</SelectItem>
                {PREDEFINED_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>changelog (可选)</Label>
            <Input
              placeholder="本次变更说明"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              disabled={inFlight}
            />
          </div>
        </div>

        {upload.error && (
          <Alert variant="destructive">
            <AlertDescription>{(upload.error as Error).message}</AlertDescription>
          </Alert>
        )}
        {inFlight && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progressLabel}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={inFlight}>
            取消
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!file || !code || !name || !description || inFlight}
          >
            {inFlight && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}