import { describe, it, expect, beforeEach, vi } from "vitest"
import { vibeApi } from "./vibe-api"
import type {
  GoalSnapshot,
  UploadResult,
} from "../lib/vibe-types"

// 测试环境里 `import.meta.env.VITE_API_BASE_URL` 是 undefined,
// `vibe-api.ts` 会 fallback 到 `/api`。我们只断言 URL 的后缀。
const U = (path: string): string => `/api${path}`

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

function mockFetchOnce(
  body: unknown,
  init?: { status?: number; ok?: boolean },
): ReturnType<typeof vi.fn> {
  const status = init?.status ?? 200
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      statusText: String(status),
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as ReturnType<typeof vi.fn>
}

const GOAL_SNAPSHOT: GoalSnapshot = {
  goal: {
    goal_id: "g-1",
    session_id: "s-1",
    status: "active",
    objective: "find stuff",
    ui_summary: "summary",
    source: "user",
    protocol: "default",
    risk_tier: "research_general",
    tokens_used: 0,
    turns_used: 0,
    time_used_seconds: 0,
    budget_wrapup_sent: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  claims: [],
  criteria: [],
  evidence: [],
  evidence_count: 0,
}

describe("vibeApi.uploadFile", () => {
  it("POSTs multipart/form-data to /v1/ai-agent/upload and unwraps the { data } envelope", async () => {
    localStorage.setItem("auth_token", "tok-123")
    const file = new File(["hello"], "doc.pdf", { type: "application/pdf" })
    const inner: UploadResult = {
      status: "ok",
      file_path: "/tmp/doc.pdf",
      filename: "doc.pdf",
    }
    // 关键:服务端走 TransformResponseInterceptor,响应永远是 { data: ... } 包络。
    // 之前的回归 bug 就是这条线 —— mock 返回裸 inner 让测试通过,生产却把
    // inner 当 envelope 用,result.filename / result.file_path 全是 undefined,
    // 前端 use-chat-stream 注入 prefix 时变成
    // "[Uploaded file: undefined, path: undefined]"。
    const fetchSpy = mockFetchOnce({ data: inner })

    const got = await vibeApi.uploadFile(file)

    expect(got).toEqual(inner)
    expect(got).not.toBeNull()
    expect(got?.filename).toBe("doc.pdf")
    expect(got?.file_path).toBe("/tmp/doc.pdf")
    expect(got?.filename).not.toBeUndefined()
    expect(got?.file_path).not.toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/upload"))
    expect(init.method).toBe("POST")
    expect(init.body).toBeInstanceOf(FormData)
    const fd = init.body as FormData
    expect(fd.get("file")).toBe(file)
    // 不应手动设置 Content-Type — 让 fetch 自动加 boundary。
    const headers = (init.headers ?? {}) as Record<string, string>
    expect(headers["Content-Type"]).toBeUndefined()
    expect(headers["content-type"]).toBeUndefined()
    // 注入 token 头。
    expect(headers["Authorization"]).toBe("Bearer tok-123")
  })

  it("returns filename and file_path populated (regression: undefined prefix bug)", async () => {
    // 这个测试独立于 fetch init 检查,专门钉住"返回对象的字段必须非 undefined"
    // —— 一旦有人把 unwrap 删掉或 mock 改回裸 UploadResult,这条立刻 fail。
    localStorage.setItem("auth_token", "tok-123")
    const file = new File(["x"], "x.pdf", { type: "application/pdf" })
    mockFetchOnce({
      data: {
        status: "ok",
        file_path: "uploads/6e099ad6bba749c2afdef111fb56e2fb.pdf",
        filename: "2-3 山东宏桥.pdf",
      },
    })

    const got = await vibeApi.uploadFile(file)

    // 直接字段断言,不允许 undefined(防止 mock 漂移 + unwrap 漏掉两个 bug 一起回归)。
    expect(got).toBeDefined()
    expect(got!.filename).toBe("2-3 山东宏桥.pdf")
    expect(got!.file_path).toBe("uploads/6e099ad6bba749c2afdef111fb56e2fb.pdf")
  })
})

describe("vibeApi.goal", () => {
  it("getGoal GETs /v1/ai-agent/sessions/:id/goal and unwraps { data }", async () => {
    const fetchSpy = mockFetchOnce({ data: GOAL_SNAPSHOT })

    const got = await vibeApi.getGoal("s-1")

    expect(got).toEqual(GOAL_SNAPSHOT)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/sessions/s-1/goal"))
    expect(init.method).toBe("GET")
  })

  it("getGoal returns null when data is null (no goal yet)", async () => {
    mockFetchOnce({ data: null })

    const got = await vibeApi.getGoal("s-1")

    expect(got).toBeNull()
  })

  it("createGoal POSTs objective as JSON body and unwraps { data: snapshot }", async () => {
    const fetchSpy = mockFetchOnce({ data: GOAL_SNAPSHOT })

    const got = await vibeApi.createGoal("s-1", { objective: "find alpha" })

    // Server wraps the vibe pass-through response via TransformResponseInterceptor,
    // so we must unwrap `.data` — otherwise GoalChip would render `snapshot.goal`
    // as undefined and throw on `.ui_summary` access.
    expect(got).toEqual(GOAL_SNAPSHOT)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/sessions/s-1/goal"))
    expect(init.method).toBe("POST")
    expect(init.body).toBe(JSON.stringify({ objective: "find alpha" }))
    const headers = (init.headers ?? {}) as Record<string, string>
    expect(headers["Content-Type"]).toBe("application/json")
  })

  it("updateGoal PATCHes with expected_goal_id and unwraps { data }", async () => {
    const responseBody = { goal: GOAL_SNAPSHOT.goal, snapshot: GOAL_SNAPSHOT }
    const fetchSpy = mockFetchOnce({ data: responseBody })

    const got = await vibeApi.updateGoal("s-1", {
      goal_id: "g-1",
      expected_goal_id: "g-1",
      ui_summary: "tweak",
    })

    expect(got).toEqual(responseBody)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/sessions/s-1/goal"))
    expect(init.method).toBe("PATCH")
    expect(init.body).toBe(
      JSON.stringify({
        goal_id: "g-1",
        expected_goal_id: "g-1",
        ui_summary: "tweak",
      }),
    )
  })

  it("updateGoalStatus PATCHes /goal/status with status body and unwraps { data }", async () => {
    const responseBody = {
      goal: GOAL_SNAPSHOT.goal,
      snapshot: GOAL_SNAPSHOT,
    }
    const fetchSpy = mockFetchOnce({ data: responseBody })

    const got = await vibeApi.updateGoalStatus("s-1", {
      goal_id: "g-1",
      expected_goal_id: "g-1",
      status: "cancelled",
    })

    expect(got).toEqual(responseBody)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/sessions/s-1/goal/status"))
    expect(init.method).toBe("PATCH")
    expect(init.body).toBe(
      JSON.stringify({
        goal_id: "g-1",
        expected_goal_id: "g-1",
        status: "cancelled",
      }),
    )
  })
})

describe("vibeApi.swarm", () => {
  it("listSwarmRuns GETs /swarm/runs?limit=20 by default", async () => {
    const fetchSpy = mockFetchOnce([{ id: "run-1" }])

    const got = await vibeApi.listSwarmRuns()

    expect(got).toEqual([{ id: "run-1" }])
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/swarm/runs?limit=20"))
  })

  it("getSwarmRun GETs /swarm/runs/:id", async () => {
    const fetchSpy = mockFetchOnce({ id: "run-1", status: "running" })

    const got = await vibeApi.getSwarmRun("run-1")

    expect(got).toEqual({ id: "run-1", status: "running" })
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/swarm/runs/run-1"))
    expect(init.method).toBe("GET")
  })
})