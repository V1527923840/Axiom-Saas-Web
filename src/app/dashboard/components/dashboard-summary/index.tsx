import { LatestDailyCard } from './latest-daily-card'
import { LatestWeeklyCard } from './latest-weekly-card'

export function DashboardSummary() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 lg:px-6 py-6">
      <LatestDailyCard />
      <LatestWeeklyCard />
    </div>
  )
}
