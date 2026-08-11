import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DailySection = {
  key_points?: string[]
  section_key?: string
  section_title: string
  section_content: string
  source_post_ids?: number[]
  source_research_ids?: number[]
}

function isDailySectionArray(x: unknown): x is DailySection[] {
  return (
    Array.isArray(x) &&
    x.every((s) => s && typeof s === "object" && "section_title" in s)
  )
}

export function SectionsDaily({ sections }: { sections: unknown }) {
  if (!isDailySectionArray(sections)) {
    return (
      <Alert>
        <AlertTitle>报告内容格式异常，请联系管理员</AlertTitle>
        <AlertDescription>
          {import.meta.env.DEV && (
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(sections, null, 2)}
            </pre>
          )}
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>{s.section_title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{s.section_content}</p>
            {s.key_points?.length ? (
              <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                {s.key_points.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
