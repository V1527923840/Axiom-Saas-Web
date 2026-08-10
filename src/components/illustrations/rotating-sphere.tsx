"use client"

import { useEffect, useState } from "react"

const PHI = (1 + Math.sqrt(5)) / 2 // 1.618...

/**
 * 二十面体 12 顶点（未旋转）
 */
const BASE_VERTICES: [number, number, number][] = [
  [-1,  PHI, 0], [1,  PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [ 0, -1,  PHI], [0, 1,  PHI], [0, -1, -PHI], [0, 1, -PHI],
  [ PHI, 0, -1], [ PHI, 0,  1], [-PHI, 0, -1], [-PHI, 0,  1],
]

/**
 * 二十面体 20 面（每面 3 顶点索引）
 */
const BASE_FACES: [number, number, number][] = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
]

/**
 * 细分 + 归一化构造"球"。
 *
 * - 频率 N：对每个三角面递归切 N 次
 * - 每切一次：每面变 4 个子面，新顶点是边的中点（归一化到单位球）
 * - 最后再把所有顶点整体归一化一次，确保完全球形
 *
 * 频率 3 → 162 顶点 / 320 面 / 480 条棱。形状基本是"球"，肉眼几乎看不出尖角。
 */
function buildIcosphere(frequency: number): {
  vertices: [number, number, number][]
  edges: [number, number][]
} {
  let vertices: [number, number, number][] = BASE_VERTICES.map((v) => [...v])
  let faces: [number, number, number][] = BASE_FACES.map((f) => [...f])

  for (let step = 1; step < frequency; step++) {
    const newVerts: [number, number, number][] = vertices.map((v) => [...v])
    const midpointCache = new Map<string, number>()
    const newFaces: [number, number, number][] = []

    const getMid = (a: number, b: number): number => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      const cached = midpointCache.get(key)
      if (cached !== undefined) return cached
      const va = newVerts[a]
      const vb = newVerts[b]
      const mid: [number, number, number] = [
        (va[0] + vb[0]) / 2,
        (va[1] + vb[1]) / 2,
        (va[2] + vb[2]) / 2,
      ]
      const len = Math.hypot(mid[0], mid[1], mid[2])
      mid[0] /= len
      mid[1] /= len
      mid[2] /= len
      const idx = newVerts.length
      newVerts.push(mid)
      midpointCache.set(key, idx)
      return idx
    }

    for (const [a, b, c] of faces) {
      const ab = getMid(a, b)
      const bc = getMid(b, c)
      const ca = getMid(c, a)
      newFaces.push([a, ab, ca])
      newFaces.push([b, bc, ab])
      newFaces.push([c, ca, bc])
      newFaces.push([ab, bc, ca])
    }

    vertices = newVerts
    faces = newFaces
  }

  // 关键：把所有顶点归一化到单位球 —— 消除二十面体顶点的"尖角"
  vertices = vertices.map((v) => {
    const len = Math.hypot(v[0], v[1], v[2])
    return [v[0] / len, v[1] / len, v[2] / len] as [number, number, number]
  })

  // 从面里提取唯一边
  const edgeSet = new Set<string>()
  const edges: [number, number][] = []
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (!edgeSet.has(key)) {
      edgeSet.add(key)
      edges.push([a, b])
    }
  }
  for (const [a, b, c] of faces) {
    addEdge(a, b)
    addEdge(b, c)
    addEdge(c, a)
  }

  return { vertices, edges }
}

const ICOSPHERE = buildIcosphere(3) // 频率 3：162 顶点 / 480 棱

/** 绕 Y 轴旋转 */
function rotateY(
  p: [number, number, number],
  a: number,
): [number, number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]
}

/** 绕 X 轴旋转 */
function rotateX(
  p: [number, number, number],
  a: number,
): [number, number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]
}

/**
 * 真正的 3D 旋转球体（细分二十面体 + 透视投影）。
 *
 * - 频率-3 细分（162 顶点）+ 所有顶点归一化到单位球 → 形状就是球
 * - 透视投影（perspective） → 远处顶点更小
 * - 棱按 z 排序绘制（保证穿插正确）
 * - 速度不均（Y 轴匀速 + X 轴正弦摆动）→ "随机感"
 * - 支持 `prefers-reduced-motion`
 */
export function RotatingSphere({
  scale = 95,
  perspective = 1100,
}: {
  scale?: number
  perspective?: number
}) {
  const [transform, setTransform] = useState({ y: 0.5, x: 0.25 })

  useEffect(() => {
    if (typeof window === "undefined") return
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (motionQuery.matches) return

    let rafId = 0
    const startTime = performance.now()

    const tick = (now: number) => {
      const t = (now - startTime) / 1000
      const yAngle = t * 0.52
      const xAngle = Math.sin(t * 0.43) * 0.22 + 0.18
      setTransform({ y: yAngle, x: xAngle })
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // 3D 旋转
  const rotated = ICOSPHERE.vertices.map((v) => {
    let r = rotateY(v, transform.y)
    r = rotateX(r, transform.x)
    return r
  })

  // 透视投影
  const projected = rotated.map(([x, y, z]) => {
    const depth = perspective / (perspective + z * scale)
    return {
      x: x * scale * depth,
      y: -y * scale * depth,
      depth,
      z,
    }
  })

  // 棱按 z 排序
  const sortedEdges = ICOSPHERE.edges
    .map(([a, b], i) => ({
      a,
      b,
      avgZ: (projected[a].z + projected[b].z) / 2,
      key: i,
    }))
    .sort((m, n) => m.avgZ - n.avgZ)

  return (
    <g>
      {sortedEdges.map((edge) => {
        const va = projected[edge.a]
        const vb = projected[edge.b]
        const opacity = 0.65 + 0.25 * ((edge.avgZ + 1) / 2)
        return (
          <line
            key={edge.key}
            x1={va.x}
            y1={va.y}
            x2={vb.x}
            y2={vb.y}
            stroke="currentColor"
            strokeWidth={0.75}
            strokeLinecap="round"
            opacity={opacity}
          />
        )
      })}
      {projected.map((v, i) => {
        const opacity = 0.75 + 0.2 * ((v.z + 1) / 2)
        const radius = 1.4 + v.z * 0.5
        return (
          <circle
            key={i}
            cx={v.x}
            cy={v.y}
            r={Math.max(radius, 1.1)}
            fill="currentColor"
            opacity={opacity}
          />
        )
      })}
    </g>
  )
}