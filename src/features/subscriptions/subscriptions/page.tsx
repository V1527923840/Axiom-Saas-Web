"use client"

import { useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { useSubscription } from "../hooks/use-subscription"
import { usePlans } from "../../plans/hooks/use-plans"
import { CurrentSubscription } from "../components/current-subscription"
import { SubscriptionDialog } from "../components/subscription-dialog"
import { SubscriptionHistory } from "../components/subscription-history"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SubscriptionsPage() {
  // list pagination 用 local state — TanStack Query 的 queryKey 把 page/pageSize
  // 包进去,params 变了 useQuery 会自动重新拉,翻页不用手动 refetch。
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const {
    items: subscriptions,
    pagination,
    currentSubscription,
    isLoading,
    isLoadingCurrent,
    isMutating,
    error,
    subscribe,
    cancelSubscription,
  } = useSubscription({ page, pageSize })

  // 老的 useSubscription 把 loading 和 isMutating 合一个 flag;
  // 现在拆成 isLoading (list fetch) + isLoadingCurrent (current fetch) +
  // isMutating (任何 mutation 在飞)。子组件只要 list 的 loading —
  // current 用 isLoadingCurrent,dialog 用 isMutating。

  // plans 现在走 TanStack Query — 传 params 自动 fetch,这里只要 `items`
  // 给套餐下拉用。filter `status: 'active'` 是为了下拉不显示禁用/废弃套餐
  // (跟 user-form 里的行为对齐)。
  const { items: plans } = usePlans({ page: 0, pageSize: 100, status: "active" })

  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)

  const handleUpgrade = () => {
    setSubscriptionDialogOpen(true)
  }

  const handleCancel = async () => {
    if (confirm("确定要取消当前订阅吗？")) {
      try {
        // In real app, would need current subscription ID
        await cancelSubscription("sub_1")
      } catch (error) {
        console.error("Failed to cancel subscription:", error)
      }
    }
  }

  const handleSelectPlan = async (planId: string, autoRenew: boolean) => {
    try {
      // mutateAsync 成功后 hook 内部已经 invalidate 了 list + current —
      // 不需要再手动 fetchSubscriptions / fetchCurrentSubscription。
      await subscribe(planId, autoRenew)
      setSubscriptionDialogOpen(false)
    } catch (error) {
      console.error("Failed to subscribe:", error)
    }
  }

  const handlePageChange = (next: number) => {
    setPage(next)
  }

  const handlePageSizeChange = (next: number) => {
    setPageSize(next)
    setPage(0)
  }

  return (
    <BaseLayout title="订阅管理" description="管理用户订阅">
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
          加载错误: {error instanceof Error ? error.message : String(error)}
        </div>
      )}
      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current" className="cursor-pointer">
            当前套餐
          </TabsTrigger>
          <TabsTrigger value="history" className="cursor-pointer">
            订阅历史
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4">
          <CurrentSubscription
            subscription={currentSubscription}
            loading={isLoadingCurrent}
            onUpgrade={handleUpgrade}
            onCancel={currentSubscription ? handleCancel : undefined}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <SubscriptionHistory
            subscriptions={subscriptions}
            loading={isLoading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: handlePageChange,
              onPageSizeChange: handlePageSizeChange,
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Subscription Dialog */}
      <SubscriptionDialog
        open={subscriptionDialogOpen}
        onOpenChange={setSubscriptionDialogOpen}
        plans={plans}
        currentPlanId={currentSubscription?.planName ? "plan_2" : undefined}
        onSelectPlan={handleSelectPlan}
        loading={isMutating}
      />
    </div>
    </BaseLayout>
  )
}
