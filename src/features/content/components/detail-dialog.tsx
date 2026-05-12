"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Play, Pause, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  collectedAt: string
  createdAt: string
  summary: string
  children: React.ReactNode
}

export function DetailDialog({
  open,
  onOpenChange,
  title,
  collectedAt,
  createdAt,
  summary,
  children,
}: DetailDialogProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl leading-tight pr-8">{title}</DialogTitle>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">
              收录: {formatDate(collectedAt)}
            </Badge>
            <Badge variant="secondary">
              创建: {formatDate(createdAt)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Summary Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">一句话总结</h3>
            <p className="text-sm leading-relaxed">{summary}</p>
          </div>

          <Separator />

          {/* Dynamic Content Area */}
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Audio Player Component
interface AudioPlayerProps {
  audioUrl: string
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">音频播放</h3>
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlay}
          className="shrink-0 cursor-pointer"
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <div className="flex-1 relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground font-mono w-12 text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}

// Image Grid Component
interface ImageGridProps {
  images: string[]
}

export function ImageGrid({ images }: ImageGridProps) {
  const [previewImage, setPreviewImage] = React.useState<string | null>(null)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">相关图片</h3>
      <div className="grid grid-cols-3 gap-2">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setPreviewImage(image)}
          >
            <img
              src={image}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  )
}

// Scrollable Text Component
interface ScrollableTextProps {
  label: string
  content: string
}

export function ScrollableText({ label, content }: ScrollableTextProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">{label}</h3>
      <ScrollArea className="h-48 w-full rounded-md border p-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </ScrollArea>
    </div>
  )
}

// Refined Summary Component
interface RefinedSummaryProps {
  content: string
}

export function RefinedSummary({ content }: RefinedSummaryProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">总结提炼</h3>
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  )
}

// PDF Section Component
interface PDFSectionProps {
  pdfUrl: string
}

export function PDFSection({ pdfUrl }: PDFSectionProps) {
  const handleOpenPDF = () => {
    window.open(pdfUrl, '_blank')
  }

  const handleDownloadPDF = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = pdfUrl.split('/').pop() || 'document.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">源文件 PDF</h3>
      <div className="flex gap-2">
        <Button onClick={handleOpenPDF} variant="outline" size="sm" className="cursor-pointer">
          <ExternalLink className="size-4 mr-2" />
          打开PDF
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="cursor-pointer">
          <Download className="size-4 mr-2" />
          下载
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden h-64">
        <iframe
          src={pdfUrl}
          className="w-full h-full"
          title="PDF Preview"
        />
      </div>
    </div>
  )
}