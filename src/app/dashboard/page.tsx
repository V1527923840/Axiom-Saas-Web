import { BaseLayout } from '@/components/layouts/base-layout'
import { DashboardSummary } from './components/dashboard-summary'

export default function Page() {
  return (
    <BaseLayout title="Dashboard" description="日报 / 周报">
      <DashboardSummary />
    </BaseLayout>
  )
}
