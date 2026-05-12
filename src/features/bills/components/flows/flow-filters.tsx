"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FlowFilters } from "../../types"
import type { PaymentType, PaymentMethod, PaymentStatus } from "../../types"

interface FlowFiltersProps {
  onFilterChange: (filters: FlowFilters) => void
  initialFilters?: FlowFilters
}

export function FlowFilters({ onFilterChange, initialFilters }: FlowFiltersProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(
    initialFilters?.dateRange
  )
  const [userSearch, setUserSearch] = useState(initialFilters?.userSearch || "")
  const [type, setType] = useState<"all" | PaymentType>(initialFilters?.type || "all")
  const [paymentMethod, setPaymentMethod] = useState<"all" | PaymentMethod>(
    initialFilters?.paymentMethod || "all"
  )
  const [status, setStatus] = useState<"all" | PaymentStatus>(initialFilters?.status || "all")

  const handleApply = () => {
    onFilterChange({
      dateRange,
      userSearch,
      type,
      paymentMethod,
      status,
    })
  }

  const handleReset = () => {
    setDateRange(undefined)
    setUserSearch("")
    setType("all")
    setPaymentMethod("all")
    setStatus("all")
    onFilterChange({
      dateRange: undefined,
      userSearch: "",
      type: "all",
      paymentMethod: "all",
      status: "all",
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[280px] justify-start text-left font-normal cursor-pointer"
            >
              <CalendarIcon className="mr-2 size-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "yyyy-MM-dd")} - {format(dateRange.to, "yyyy-MM-dd")}
                  </>
                ) : (
                  format(dateRange.from, "yyyy-MM-dd")
                )
              ) : (
                "选择日期范围"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to })
                } else {
                  setDateRange(undefined)
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* User Search */}
        <Input
          placeholder="搜索用户名称或邮箱..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="max-w-xs"
        />

        {/* Type Select */}
        <Select
          value={type}
          onValueChange={(value) => setType(value as "all" | PaymentType)}
        >
          <SelectTrigger className="w-[140px] cursor-pointer">
            <SelectValue placeholder="充值类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="recharge">充值</SelectItem>
            <SelectItem value="refund">退款</SelectItem>
          </SelectContent>
        </Select>

        {/* Payment Method Select */}
        <Select
          value={paymentMethod}
          onValueChange={(value) => setPaymentMethod(value as "all" | PaymentMethod)}
        >
          <SelectTrigger className="w-[140px] cursor-pointer">
            <SelectValue placeholder="支付方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部方式</SelectItem>
            <SelectItem value="wechat">微信</SelectItem>
            <SelectItem value="alipay">支付宝</SelectItem>
            <SelectItem value="bankcard">银行卡</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Select */}
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as "all" | PaymentStatus)}
        >
          <SelectTrigger className="w-[140px] cursor-pointer">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="failed">已失败</SelectItem>
            <SelectItem value="refunded">已退款</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleApply} className="cursor-pointer">
          搜索
        </Button>
        <Button variant="outline" onClick={handleReset} className="cursor-pointer">
          重置
        </Button>
      </div>
    </div>
  )
}