"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as pdfjsLib from "pdfjs-dist"
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react"

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

interface PdfRendererProps {
  url: string
  className?: string
}

export function PdfRenderer({ url, className }: PdfRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [ready, setReady] = useState(false)

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const pageNumRef = useRef(1)
  const scaleRef = useRef(1.0)
  const panRef = useRef({ x: 0, y: 0 })
  scaleRef.current = scale
  panRef.current = pan
  pageNumRef.current = currentPage

  const minScale = 0.5
  const maxScale = 3.0
  const scaleStep = 0.25

  // Load PDF
  useEffect(() => {
    let cancelled = false

    const loadPdf = async () => {
      setLoading(true)
      setError(null)
      setCurrentPage(1)
      setScale(1.0)
      setPan({ x: 0, y: 0 })
      setReady(false)
      pageNumRef.current = 1

      try {
        const loadingTask = pdfjsLib.getDocument(url)
        const pdf = await loadingTask.promise

        if (cancelled) return

        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setLoading(false)

        // Wait for next tick, then set ready
        await new Promise(resolve => setTimeout(resolve, 100))
        if (cancelled) return
        setReady(true)
      } catch (err) {
        if (cancelled) return
        console.error("PDF load error:", err)
        setError("PDF加载失败")
        setLoading(false)
      }
    }

    loadPdf()

    return () => {
      cancelled = true
    }
  }, [url])

  // Render when ready or page/scale changes
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    const pdf = pdfDocRef.current
    if (!canvas || !pdf) return

    try {
      const page = await pdf.getPage(pageNumRef.current)
      const viewport = page.getViewport({ scale: scaleRef.current })

      canvas.height = viewport.height
      canvas.width = viewport.width

      const context = canvas.getContext("2d")
      if (!context) return

      await page.render({
        canvasContext: context,
        viewport,
      }).promise
    } catch (err) {
      console.error("Render error:", err)
    }
  }, [])

  useEffect(() => {
    if (!ready) return

    renderCanvas()
  }, [ready, renderCanvas])

  useEffect(() => {
    if (!ready) return
    renderCanvas()
  }, [currentPage, scale, pan, ready, renderCanvas])

  const goToPrevPage = () => {
    if (currentPage <= 1) return
    setCurrentPage(currentPage - 1)
    setPan({ x: 0, y: 0 })
  }

  const goToNextPage = () => {
    if (currentPage >= numPages) return
    setCurrentPage(currentPage + 1)
    setPan({ x: 0, y: 0 })
  }

  const zoomIn = () => {
    setScale((s) => Math.min(s + scaleStep, maxScale))
    setPan({ x: 0, y: 0 })
  }

  const zoomOut = () => {
    setScale((s) => Math.max(s - scaleStep, minScale))
    setPan({ x: 0, y: 0 })
  }

  const resetZoom = () => {
    setScale(1.0)
    setPan({ x: 0, y: 0 })
  }

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsPanning(true)
    e.preventDefault()
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return
      setPan((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }))
    },
    [isPanning]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  useEffect(() => {
    if (isPanning) {
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("mousemove", handleMouseMove as any)
      return () => {
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("mousemove", handleMouseMove as any)
      }
    }
  }, [isPanning, handleMouseUp, handleMouseMove])

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className || ""}`}>
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className || ""}`}>
        <div className="text-sm text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between shrink-0 mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            title="上一页"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm text-muted-foreground min-w-[80px] text-center">
            第 {currentPage} / {numPages} 页
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            title="下一页"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= minScale}
            className="p-1.5 rounded border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            title="缩小"
          >
            <ZoomOut className="size-4" />
          </button>
          <span className="text-sm text-muted-foreground min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= maxScale}
            className="p-1.5 rounded border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            title="放大"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            onClick={resetZoom}
            className="p-1.5 rounded border hover:bg-muted text-xs"
            title="重置"
          >
            重置
          </button>
        </div>
      </div>

      {/* Canvas container with pan */}
      <div
        ref={containerRef}
        className="border rounded-lg overflow-auto bg-slate-50 flex justify-center flex-1"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transition: isPanning ? "none" : "transform 0.1s ease-out",
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Hint */}
      <div className="text-xs text-muted-foreground mt-1 text-center">
        拖拽平移
      </div>
    </div>
  )
}