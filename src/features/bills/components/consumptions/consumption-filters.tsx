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
import type { ConsumptionFilters } from "../../types"
import type { ConsumptionType } from "../../types"

interface ConsumptionFiltersProps {
  onFilterChange: (filters: ConsumptionFilters) => void
  initialFilters?: ConsumptionFilters
}

export function ConsumptionFilters({ onFilterChange, initialFilters }: ConsumptionFiltersProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(
    initialFilters?.dateRange
  )
  const [userSearch, setUserSearch] = useState(initialFilters?.userSearch || "")
  const [consumptionType, setConsumptionType] = useState<"all" | ConsumptionType>(
    initialFilters?.consumptionType || "all"
  )

  const handleApply = () => {
    onFilterChange({
      dateRange,
      userSearch,
      consumptionType,
    })
  }

  const handleReset = () => {
    setDateRange(undefined)
    setUserSearch("")
    setConsumptionType("all")
    onFilterChange({
      dateRange: undefined,
      userSearch: "",
      consumptionType: "all",
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

        {/* Consumption Type Select */}
        <Select
          value={consumptionType}
          onValueChange={(value) => setConsumptionType(value as "all" | ConsumptionType)}
        >
          <SelectTrigger className="w-[140px] cursor-pointer">
            <SelectValue placeholder="消费类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="chat">聊天</SelectItem>
            <SelectItem value="redeem">兑换</SelectItem>
            <SelectItem value="other">其他</SelectItem>
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