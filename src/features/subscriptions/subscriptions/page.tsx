"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { useAuth } from "@/contexts/auth-context"
import { useSubscription } from "../hooks/use-subscription"
import { usePlans } from "../../plans/hooks/use-plans"
import { CurrentSubscription } from "../components/current-subscription"
import { SubscriptionDialog } from "../components/subscription-dialog"
import { SubscriptionHistory } from "../components/subscription-history"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SubscriptionsPage() {
  const { token } = useAuth()
  const {
    subscriptions,
    currentSubscription,
    loading,
    error,
    pagination,
    fetchSubscriptions,
    fetchCurrentSubscription,
    subscribe,
    cancelSubscription,
  } = useSubscription()

  const { plans, fetchPlans } = usePlans()

  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)

  useEffect(() => {
    if (token) {
      fetchCurrentSubscription()
      fetchSubscriptions({ page: 0, pageSize: 10 })
      fetchPlans({ page: 0, pageSize: 100 })
    }
  }, [token])

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
      await subscribe(planId, autoRenew)
      setSubscriptionDialogOpen(false)
      fetchCurrentSubscription()
      fetchSubscriptions({ page: 0, pageSize: 10 })
    } catch (error) {
      console.error("Failed to subscribe:", error)
    }
  }

  const handlePageChange = (page: number) => {
    fetchSubscriptions({ page, pageSize: pagination.pageSize })
  }

  const handlePageSizeChange = (pageSize: number) => {
    fetchSubscriptions({ page: 0, pageSize })
  }

  return (
    <BaseLayout title="订阅管理" description="管理用户订阅">
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
          加载错误: {error}
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
            loading={loading}
            onUpgrade={handleUpgrade}
            onCancel={currentSubscription ? handleCancel : undefined}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <SubscriptionHistory
            subscriptions={subscriptions}
            loading={loading}
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
        loading={loading}
      />
    </div>
    </BaseLayout>
  )
}