import { BaseLayout } from '@/components/layouts/base-layout'
import { DashboardSummary } from './components/dashboard-summary'

export default function Page() {
  return (
    <BaseLayout title="Dashboard" description="每日概览">
      <DashboardSummary />
    </BaseLayout>
  )
}
