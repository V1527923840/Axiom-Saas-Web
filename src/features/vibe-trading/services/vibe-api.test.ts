import { describe, it, expect, beforeEach, vi } from "vitest"
import { vibeApi } from "./vibe-api"
import type {
  GoalSnapshot,
  SwarmPreset,
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
  it("POSTs multipart/form-data to /v1/ai-agent/upload and returns UploadResult", async () => {
    localStorage.setItem("auth_token", "tok-123")
    const file = new File(["hello"], "doc.pdf", { type: "application/pdf" })
    const result: UploadResult = {
      status: "ok",
      file_path: "/tmp/doc.pdf",
      filename: "doc.pdf",
    }
    const fetchSpy = mockFetchOnce(result)

    const got = await vibeApi.uploadFile(file)

    expect(got).toEqual(result)
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

  it("addGoalEvidence POSTs to /goal/evidence and unwraps { data }", async () => {
    const responseBody = {
      evidence: { evidence_id: "e-1" },
      snapshot: GOAL_SNAPSHOT,
    }
    const fetchSpy = mockFetchOnce({ data: responseBody })

    const got = await vibeApi.addGoalEvidence("s-1", {
      goal_id: "g-1",
      expected_goal_id: "g-1",
      text: "new finding",
    })

    expect(got).toEqual(responseBody)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/sessions/s-1/goal/evidence"))
    expect(init.method).toBe("POST")
    expect(init.body).toBe(
      JSON.stringify({
        goal_id: "g-1",
        expected_goal_id: "g-1",
        text: "new finding",
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
  const PRESETS: SwarmPreset[] = [
    {
      name: "deep_research",
      title: "Deep Research",
      description: "multi-agent research",
      agent_count: 3,
      variables: [
        { name: "ticker", description: "stock ticker", required: true },
      ],
    },
  ]

  it("listSwarmPresets GETs /swarm/presets WITHOUT Authorization header", async () => {
    localStorage.setItem("auth_token", "tok-123")
    const fetchSpy = mockFetchOnce(PRESETS)

    const got = await vibeApi.listSwarmPresets()

    expect(got).toEqual(PRESETS)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/swarm/presets"))
    // presets 路由在 controller 层是公开的(无 JWT)。前端不应该注入 Authorization。
    const headers = (init.headers ?? {}) as Record<string, string>
    expect(headers["Authorization"]).toBeUndefined()
  })

  it("createSwarmRun POSTs preset_name + user_vars and returns {id, status, preset_name}", async () => {
    const fetchSpy = mockFetchOnce({
      id: "run-1",
      status: "pending",
      preset_name: "deep_research",
    })

    const got = await vibeApi.createSwarmRun("deep_research", { ticker: "AAPL" })

    expect(got).toEqual({
      id: "run-1",
      status: "pending",
      preset_name: "deep_research",
    })
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/swarm/runs"))
    expect(init.method).toBe("POST")
    expect(init.body).toBe(
      JSON.stringify({
        preset_name: "deep_research",
        user_vars: { ticker: "AAPL" },
      }),
    )
  })

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

  it("cancelSwarmRun POSTs to /swarm/runs/:id/cancel", async () => {
    const fetchSpy = mockFetchOnce({ status: "cancelled" })

    const got = await vibeApi.cancelSwarmRun("run-1")

    expect(got).toEqual({ status: "cancelled" })
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/swarm/runs/run-1/cancel"))
    expect(init.method).toBe("POST")
  })

  it("retrySwarmRun POSTs to /swarm/runs/:id/retry", async () => {
    const fetchSpy = mockFetchOnce({
      id: "run-1",
      status: "pending",
      preset_name: "deep_research",
    })

    await vibeApi.retrySwarmRun("run-1")

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(U("/v1/ai-agent/swarm/runs/run-1/retry"))
    expect(init.method).toBe("POST")
  })
})