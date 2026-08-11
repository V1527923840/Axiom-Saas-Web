import { describe, expect, it, vi, beforeEach } from "vitest"
import { get } from "@/lib/api"
import {
  getLatestDailySummary,
  listDailySummaries,
  getDailySummary,
  getDailySummarySources,
} from "./daily-summary"

vi.mock("@/lib/api", () => ({ get: vi.fn() }))

const mockedGet = vi.mocked(get)

beforeEach(() => {
  mockedGet.mockReset()
})

describe("getLatestDailySummary", () => {
  it("should call GET /v1/daily-summary/latest with frequency", async () => {
    mockedGet.mockResolvedValue({
      data: { reportId: "r1", frequency: "daily" },
    } as never)

    const r = await getLatestDailySummary("tok", "daily")

    expect(mockedGet).toHaveBeenCalledWith(
      "/v1/daily-summary/latest",
      expect.objectContaining({ params: { frequency: "daily" }, token: "tok" }),
    )
    expect(r.data?.reportId).toBe("r1")
  })
})

describe("listDailySummaries", () => {
  it("should pass frequency/page/pageSize as query params", async () => {
    mockedGet.mockResolvedValue({ data: [], meta: {} } as never)

    await listDailySummaries("tok", {
      frequency: "weekly",
      page: 1,
      pageSize: 10,
    })

    expect(mockedGet).toHaveBeenCalledWith(
      "/v1/daily-summary",
      expect.objectContaining({
        params: { frequency: "weekly", page: 1, pageSize: 10 },
        token: "tok",
      }),
    )
  })

  // The server's TransformResponseInterceptor flattens the service's
  // { data, total, page, pageSize } into { data, meta: { total, page,
  // pageSize } }, so pagination lives on `meta` — not inside `data`.
  it("should read pagination from the envelope meta", async () => {
    mockedGet.mockResolvedValue({
      data: [{ reportId: "r1" }],
      meta: { total: 3, page: 0, pageSize: 2 },
    } as never)

    const r = await listDailySummaries("tok")

    expect(r.data).toHaveLength(1)
    expect(r.total).toBe(3)
    expect(r.page).toBe(0)
    expect(r.pageSize).toBe(2)
  })

  it("should fall back to sent params when meta is absent", async () => {
    mockedGet.mockResolvedValue({ data: undefined } as never)

    const r = await listDailySummaries(null, { page: 2, pageSize: 5 })

    expect(r.data).toEqual([])
    expect(r.total).toBe(0)
    expect(r.page).toBe(2)
    expect(r.pageSize).toBe(5)
  })
})

describe("getDailySummary", () => {
  it("should call GET /v1/daily-summary/:id", async () => {
    mockedGet.mockResolvedValue({ data: { reportId: "r1" } } as never)

    await getDailySummary("tok", "r1")

    expect(mockedGet).toHaveBeenCalledWith(
      "/v1/daily-summary/r1",
      expect.objectContaining({ token: "tok" }),
    )
  })
})

describe("getDailySummarySources", () => {
  it("should call GET /v1/daily-summary/:id/sources", async () => {
    mockedGet.mockResolvedValue({ data: { posts: [], research: [] } } as never)

    await getDailySummarySources("tok", "r1")

    expect(mockedGet).toHaveBeenCalledWith(
      "/v1/daily-summary/r1/sources",
      expect.objectContaining({ token: "tok" }),
    )
  })
})
