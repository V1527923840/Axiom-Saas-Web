import { BaseLayout } from '@/components/layouts/base-layout'
import { SummariesTable } from './components/summaries-table'

export default function Page() {
  return (
    <BaseLayout title="日报 / 周报" description="历史日报 / 周报">
      <SummariesTable />
    </BaseLayout>
  )
}
