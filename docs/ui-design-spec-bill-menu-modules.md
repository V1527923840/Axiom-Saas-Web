# UI设计规范文档 - 账单管理与菜单管理模块

## 1. 概述

本文档定义了"账单管理"和"菜单管理"两个模块的UI界面原型设计规范，确保与现有管理后台风格保持一致。

### 技术栈
- React 19 + TypeScript
- Tailwind CSS v4 (使用 CSS 变量定义 Design Token)
- Radix UI 组件库
- TanStack Table (用于数据表格)

---

## 2. 页面布局线框图

### 2.1 流水管理页面 (`/bills/flows`)

```
+------------------------------------------------------------------+
|  [Sidebar]                                                        |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  | SiteHeader                                                    | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  页面标题区 (px-4 lg:px-6)                                    | |
|  |  ------------------------------------------------------------  | |
|  |  流水管理                                                     | |
|  |  查看所有用户的账户流水记录                                    | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  筛选区 (flex flex-col gap-4 sm:flex-row sm:items-center)     | |
|  |  ------------------------------------------------------------  | |
|  |  [日期范围选择器          ] [用户搜索输入框          ]          | |
|  |  [充值类型 ▼] [支付方式 ▼] [状态 ▼]                           | |
|  |  [搜索按钮] [重置按钮]                                        | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  数据表格区 (rounded-md border)                                | |
|  |  ------------------------------------------------------------  | |
|  |  | 账单ID | 用户信息 | 订单号 | 类型 | 支付方式 | 金额 | ... | |
|  |  |--------|----------|--------|------|----------|------|------| |
|  |  | 10001  | 张三    | ORD... | 充值 | 微信    | ¥100 | ... | |
|  |  | 10002  | 李四    | ORD... | 消费 | 支付宝  | ¥50  | ... | |
|  |  ...                                                       | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  分页区 (flex items-center justify-between)                   | |
|  |  ------------------------------------------------------------  | |
|  |  显示 10/页 | 第 1 页, 共 100 页 | [Previous] [Next]          | |
|  +--------------------------------------------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### 2.2 消费管理页面 (`/bills/consumptions`)

```
+------------------------------------------------------------------+
|  [Sidebar]                                                        |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  | SiteHeader                                                    | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  页面标题区                                                    | |
|  |  ------------------------------------------------------------  | |
|  |  消费管理                                                     | |
|  |  查看所有用户的积分消费记录                                    | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  筛选区                                                        | |
|  |  ------------------------------------------------------------  | |
|  |  [日期范围选择器          ] [用户搜索输入框          ]          | |
|  |  [消费类型 ▼]                                                 | |
|  |  [搜索按钮] [重置按钮]                                        | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  数据表格区                                                    | |
|  |  ------------------------------------------------------------  | |
|  |  | 账单ID | 用户信息 | 消费类型 | 消耗积分 | 剩余积分 | ... | |
|  |  |--------|----------|----------|----------|----------|------| |
|  |  | 20001  | 王五    | 开通会员 | -500   | 1500   | ... | |
|  |  | 20002  | 赵六    | 购买道具 | -100   | 2300   | ... | |
|  |  ...                                                       | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  分页区                                                        | |
|  +--------------------------------------------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### 2.3 菜单列表页面 (`/menus`)

```
+------------------------------------------------------------------+
|  [Sidebar]                                                        |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  | SiteHeader                                                    | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  页面标题区                                                    | |
|  |  ------------------------------------------------------------  | |
|  |  菜单管理                                    [+ 添加菜单]    | |
|  |  管理系统的菜单结构和权限配置                                  | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  数据表格区                                                    | |
|  |  ------------------------------------------------------------  | |
|  |  | 菜单ID | 菜单名称 | 编码 | 图标 | 路径 | 上级 | 排序 | 状态 | 操作 | |
|  |  |--------|----------|------|------|------|------|------|------|------| |
|  |  | 1      | 首页     | home | Home | /    | -    | 1    | 启用 | [...] | |
|  |  | 2      | 用户管理 | user | Users| /users| 首页 | 2    | 启用 | [...] | |
|  |  ...                                                       | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  分页区                                                        | |
|  +--------------------------------------------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### 2.4 角色分配页面 (`/menus/assign`)

```
+------------------------------------------------------------------+
|  [Sidebar]                                                        |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  | SiteHeader                                                    | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  页面标题区                                                    | |
|  |  ------------------------------------------------------------  | |
|  |  菜单权限分配                                                  | |
|  |  为不同角色分配菜单访问权限                                    | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  角色选择区                                                    | |
|  |  ------------------------------------------------------------  | |
|  |  [选择角色 ▼]                                                  | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  菜单树形列表 (rounded-md border p-4)                          | |
|  |  ------------------------------------------------------------  | |
|  |  [✓] 首页                      (Home)                          | |
|  |  [✓]   用户管理                (Users)                         | |
|  |  [ ]     用户列表              (UserList)                      | |
|  |  [✓]   角色管理                (Roles)                          | |
|  |  [✓] 账单管理                  (Bills)                          | |
|  |  [ ]     流水管理              (Flows)                         | |
|  |  [ ]     消费管理              (Consumptions)                  | |
|  |  [✓] 系统设置                  (Settings)                      | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  |  [保存按钮]                                                    | |
|  +--------------------------------------------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### 2.5 添加/编辑菜单弹窗

```
+------------------------------------------+
|  添加菜单                            [X]  |
|------------------------------------------|
|                                          |
|  菜单名称                                |
|  [输入菜单名称                        ]  |
|                                          |
|  菜单编码                                |
|  [输入唯一编码                        ]  |
|                                          |
|  图标名称                                |
|  [输入图标名称 (lucide)              ]  |
|                                          |
|  路由路径                                |
|  [输入路由路径                        ]  |
|                                          |
|  上级菜单                                |
|  [选择上级菜单 ▼]                      |
|                                          |
|  排序                                    |
|  [输入排序数字                        ]  |
|                                          |
|  状态                                    |
|  [启用 ▼]                               |
|                                          |
|------------------------------------------|
|                         [取消] [保存]    |
+------------------------------------------+
```

### 2.6 详情弹窗 (流水/消费)

```
+------------------------------------------+
|  流水详情                           [X]  |
|------------------------------------------|
|                                          |
|  基本信息                                |
|  ----------                              |
|  账单ID:     10001                       |
|  订单号:     ORD20240512001              |
|  创建时间:   2024-05-12 10:30:00         |
|                                          |
|  用户信息                                |
|  ----------                              |
|  用户ID:     1001                        |
|  用户名:     张三                         |
|  手机号:     138****8888                 |
|                                          |
|  交易信息                                |
|  ----------                              |
|  充值类型:   积分充值                     |
|  支付方式:   微信支付                     |
|  充值金额:   ¥100.00                    |
|  积分数量:   1000 积分                    |
|  状态:       已完成                       |
|                                          |
|------------------------------------------|
|                                    [关闭] |
+------------------------------------------+
```

---

## 3. 组件使用清单

### 3.1 流水管理页面组件

| 组件名称 | 使用位置 | 变体/状态 | 说明 |
|---------|---------|----------|------|
| `Button` | 搜索按钮、重置按钮 | `default`, `outline` | 尺寸: `default` (h-9) |
| `Input` | 用户搜索框 | default | 带 Search 图标前缀 |
| `Select` | 充值类型、支付方式、状态筛选 | default | Trigger 尺寸 `default` |
| `SelectItem` | 下拉选项 | - | - |
| `Calendar` + `Popover` | 日期范围选择器 | - | 组合使用实现日期范围选择 |
| `Popover` | 日期选择器触发器 | - | - |
| `PopoverTrigger` | 日期选择器触发 | - | - |
| `PopoverContent` | 日期选择器内容 | - | - |
| `Table` | 数据表格容器 | - | - |
| `TableHeader` | 表头 | - | - |
| `TableBody` | 表体 | - | - |
| `TableRow` | 表格行 | `selected` | hover 状态自动应用 |
| `TableHead` | 表头单元格 | - | - |
| `TableCell` | 表身单元格 | - | - |
| `Badge` | 类型Badge、状态Badge | `secondary` + 自定义颜色 | 见状态颜色定义 |
| `Avatar` | 用户头像 | - | 显示用户首字母 |
| `AvatarFallback` | 头像后备 | - | - |
| `DropdownMenu` | 操作下拉菜单 | - | - |
| `DropdownMenuTrigger` | 触发器 | asChild | - |
| `DropdownMenuContent` | 菜单内容 | - | align: `end` |
| `DropdownMenuItem` | 菜单项 | `default`, `destructive` | 删除操作为 destructive |
| `DropdownMenuSeparator` | 菜单分隔线 | - | - |
| `Checkbox` | 行选择 (可选) | - | - |

### 3.2 消费管理页面组件

与流水管理页面相同，额外说明:

| 组件名称 | 特殊说明 |
|---------|---------|
| `Badge` | 消耗积分显示为红色负数 (`text-red-600`) |
| `剩余积分` | 普通文本，数字格式 |

### 3.3 菜单列表页面组件

| 组件名称 | 使用位置 | 变体/状态 | 说明 |
|---------|---------|----------|------|
| `Button` | 添加菜单按钮 | `default` | 带 `Plus` 图标 |
| `Table` | 数据表格 | - | - |
| `Badge` | 状态Badge | `secondary` | 启用/禁用状态 |
| `DropdownMenu` | 操作下拉 | - | 编辑、删除操作 |
| `Dialog` | 添加/编辑弹窗 | - | sm:max-w-2xl |
| `DialogContent` | 弹窗内容 | - | - |
| `DialogHeader` | 弹窗头部 | - | - |
| `DialogTitle` | 弹窗标题 | - | - |
| `DialogDescription` | 弹窗描述 | - | - |
| `DialogFooter` | 弹窗底部 | - | - |
| `Form` | 表单 | - | react-hook-form + zod |
| `FormField` | 表单字段 | - | - |
| `FormItem` | 字段容器 | - | - |
| `FormLabel` | 字段标签 | - | - |
| `FormControl` | 字段控制 | - | - |
| `Input` | 菜单名称、编码、路径输入 | - | - |
| `Select` | 上级菜单、状态选择 | - | - |
| `Separator` | 分隔线 | - | 分隔不同字段组 |

### 3.4 角色分配页面组件

| 组件名称 | 使用位置 | 变体/状态 | 说明 |
|---------|---------|----------|------|
| `Select` | 角色选择 | default | - |
| `Checkbox` | 菜单项选择 | `indeterminate` | 用于半选状态 |
| `Button` | 保存按钮 | `default` | - |

---

## 4. 颜色和间距规范

### 4.1 间距系统 (4px 网格)

```
spacing-xs:   4px   (gap-1)
spacing-sm:   8px   (gap-2)
spacing-md:   16px  (gap-4)
spacing-lg:   24px  (gap-6)
spacing-xl:   32px  (gap-8)
spacing-2xl:  48px  (gap-12)
```

### 4.2 页面级间距

```tsx
// 页面容器
<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

// 标题区域
<div className="px-4 lg:px-6">
  <div className="flex flex-col gap-2">
    <h1>...</h1>
    <p>...</p>
  </div>
</div>

// 内容区域
<div className="@container/main px-4 lg:px-6">
```

### 4.3 卡片/筛选区间距

```tsx
// 筛选区卡片内边距
<div className="grid gap-2 sm:grid-cols-4 sm:gap-4">
  <div className="space-y-2">
    <Label>...</Label>
    <Select>...</Select>
  </div>
</div>

// 搜索和按钮行
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
```

### 4.4 表格间距

```tsx
// 表格容器
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="h-10 px-2">...</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell className="p-2">...</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### 4.5 颜色变量 (CSS)

```css
/* Light Mode */
--background:     oklch(1 0 0);         /* #FFFFFF */
--foreground:      oklch(0.145 0 0);     /* #1F2937 */
--card:            oklch(1 0 0);
--card-foreground: oklch(0.145 0 0);
--primary:         oklch(0.205 0 0);     /* #1F2937 */
--secondary:       oklch(0.97 0 0);
--muted:          oklch(0.97 0 0);
--muted-foreground: oklch(0.556 0 0);
--accent:         oklch(0.97 0 0);
--destructive:    oklch(0.577 0.245 27.325);
--border:         oklch(0.922 0 0);
--input:          oklch(0.922 0 0);

/* Dark Mode */
.dark {
  --background:   oklch(0.145 0 0);      /* #111827 */
  --foreground:  oklch(0.985 0 0);       /* #F9FAFB */
  --primary:     oklch(0.922 0 0);       /* #F3F4F6 */
  --secondary:   oklch(0.269 0 0);
  --muted:       oklch(0.269 0 0);
  --destructive: oklch(0.704 0.191 22.216);
}
```

### 4.6 状态颜色定义

| 状态 | 背景色 | 文字色 | Tailwind 类 |
|-----|-------|-------|------------|
| Pending (待处理) | `bg-yellow-500/10` | `text-yellow-600` | `dark:bg-yellow-900/20 dark:text-yellow-400` |
| Completed (已完成) | `bg-green-500/10` | `text-green-600` | `dark:bg-green-900/20 dark:text-green-400` |
| Failed (失败) | `bg-red-500/10` | `text-red-600` | `dark:bg-red-900/20 dark:text-red-400` |
| Refunded (已退款) | `bg-gray-500/10` | `text-gray-600` | `dark:bg-gray-900/20 dark:text-gray-400` |
| Active (启用) | `bg-green-500/10` | `text-green-600` | `dark:bg-green-900/20 dark:text-green-400` |
| Inactive (禁用) | `bg-gray-500/10` | `text-gray-600` | `dark:bg-gray-900/20 dark:text-gray-400` |

---

## 5. 字体规范

### 5.1 字体栈

```css
--font-sans: var(--font-inter);
font-family: var(--font-inter), system-ui, sans-serif;
```

### 5.2 字号阶梯

| 用途 | 字号 | 行高 | 字重 | Tailwind |
|-----|------|------|------|----------|
| 页面标题 (h1) | 36px | 1.2 | 700 (bold) | `text-2xl font-bold tracking-tight` |
| 卡片标题 (h2) | 28px | 1.3 | 600 | `text-xl font-semibold` |
| 区块标题 (h3) | 22px | 1.4 | 600 | `text-lg font-semibold` |
| 正文 | 16px | 1.6 | 400 | `text-base` |
| 表格正文 | 14px | - | 400 | `text-sm` |
| 标签/按钮 | 14px | - | 500 (medium) | `text-sm font-medium` |
| 辅助文字 | 14px | - | 400 | `text-sm text-muted-foreground` |
| 表格表头 | 14px | - | 500 (medium) | `text-sm font-medium` |
| 描述文字 | 12px | 1.5 | 400 | `text-xs` |
| Badge | 12px | - | 500 (medium) | `text-xs font-medium` |

### 5.3 间距

```tsx
// 标题与描述之间
<h1 className="text-2xl font-bold tracking-tight">流水管理</h1>
<p className="text-muted-foreground">查看所有用户的账户流水记录</p>

// 间距: gap-2 (8px)
```

---

## 6. 状态样式定义

### 6.1 按钮状态

| 状态 | 样式 |
|-----|------|
| Default | `bg-primary text-primary-foreground` |
| Hover | `hover:bg-primary/90` |
| Active | `active:bg-primary/80` |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none` |
| Loading | 显示 LoadingSpinner + `disabled` |

### 6.2 输入框状态

| 状态 | 样式 |
|-----|------|
| Default | `border-input bg-transparent` |
| Focus | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` |
| Error | `aria-invalid:ring-destructive/20 aria-invalid:border-destructive` |
| Disabled | `disabled:cursor-not-allowed disabled:opacity-50` |

### 6.3 表格行状态

| 状态 | 样式 |
|-----|------|
| Default | `hover:bg-muted/50` |
| Hover | `hover:bg-muted/50` |
| Selected | `data-[state=selected]:bg-muted` |

### 6.4 Badge 变体

```tsx
// 状态 Badge 函数
const getStatusColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20"
    case "Completed":
    case "Active":
      return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20"
    case "Failed":
    case "Inactive":
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
    case "Refunded":
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20"
    default:
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20"
  }
}

// 使用
<Badge variant="secondary" className={getStatusColor(status)}>
  {status}
</Badge>
```

### 6.5 金额显示样式

```tsx
// 正数金额 (充值)
<span className="text-green-600 font-medium">+¥100.00</span>

// 负数金额 (消费/消耗)
<span className="text-red-600 font-medium">-500</span>

// 普通金额
<span className="font-medium">¥100.00</span>
```

---

## 7. 响应式断点

### 7.1 断点定义

```css
/* Mobile: < 640px */
/* Tablet: 640px - 1023px */
/* Desktop: >= 1024px */
```

### 7.2 响应式类使用

```tsx
// 页面标题区
<div className="px-4 lg:px-6">

// 筛选区
<div className="flex flex-col gap-4 sm:flex-row sm:items-center">

// 筛选网格
<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">

// 表格 (溢出滚动)
<div className="relative w-full overflow-x-auto">

// 分页 (部分元素仅桌面端显示)
<div className="hidden sm:block">桌面端显示</div>

// 弹窗
className="sm:max-w-2xl"
```

---

## 8. 弹窗/对话框规范

### 8.1 详情弹窗

```tsx
<DialogContent className="sm:max-w-2xl">
  <DialogHeader>
    <DialogTitle>流水详情</DialogTitle>
    <DialogDescription>查看流水的完整信息</DialogDescription>
  </DialogHeader>

  {/* 分组信息 */}
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">基本信息</h3>
      <Separator className="mb-3" />
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">账单ID:</dt>
        <dd className="font-medium">10001</dd>
        {/* ... */}
      </dl>
    </div>
  </div>

  <DialogFooter>
    <Button variant="outline" onClick={() => setOpen(false)}>关闭</Button>
  </DialogFooter>
</DialogContent>
```

### 8.2 表单弹窗

```tsx
<DialogContent className="sm:max-w-2xl">
  <DialogHeader>
    <DialogTitle>添加菜单</DialogTitle>
    <DialogDescription>创建一个新的菜单项</DialogDescription>
  </DialogHeader>

  <Form {...form}>
    <form className="space-y-4">
      <FormField name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>菜单名称</FormLabel>
          <FormControl>
            <Input placeholder="输入菜单名称" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <div className="grid grid-cols-2 gap-4">
        {/* 左侧字段 */}
        {/* 右侧字段 */}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
        <Button type="submit">保存</Button>
      </DialogFooter>
    </form>
  </Form>
</DialogContent>
```

---

## 9. 图标使用规范

### 9.1 Lucide React 图标

| 图标名称 | 用途 | 尺寸 |
|---------|------|------|
| `Search` | 搜索输入框前缀 | `size-4` |
| `Plus` | 添加按钮 | `h-4 w-4` |
| `Eye` | 查看操作 | `size-4` |
| `Pencil` | 编辑操作 | `size-4` |
| `Trash2` | 删除操作 | `size-4` |
| `EllipsisVertical` | 更多操作触发 | `size-4` |
| `ChevronDown` | 下拉触发 | `size-4` |
| `ChevronLeft` / `ChevronRight` | 分页 | `size-4` |
| `Download` | 导出按钮 | `h-4 w-4` |
| `X` | 弹窗关闭 | `size-4` |
| `Home` | 首页图标 | `size-4` |
| `Users` | 用户管理图标 | `size-4` |
| `Settings` | 设置图标 | `size-4` |

### 9.2 图标使用位置

```tsx
// 按钮内图标
<Button>
  <Plus className="mr-2 h-4 w-4" />
  添加菜单
</Button>

// 输入框前缀
<div className="relative">
  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-9" />
</div>

// 操作按钮
<Button variant="ghost" size="icon" className="h-8 w-8">
  <Eye className="size-4" />
</Button>
```

---

## 10. 动画和过渡

### 10.1 组件内置动画

```tsx
// Dialog 动画
className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"

// DropdownMenu 动画
className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"

// SelectContent 动画
className="data-[state=open]:animate-in data-[state=closed]:animate-out"

// 过渡时间
className="duration-200"
```

### 10.2 自定义过渡

```tsx
// 按钮过渡
className="transition-all"

// 表格行过渡
className="transition-colors"

// 输入框过渡
className="transition-[color,box-shadow]"
```

---

## 11. 辅助功能 (A11y)

### 11.1 焦点管理

```tsx
// 视觉焦点样式
className="focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

// 屏幕阅读器专用
<span className="sr-only">查看详情</span>
```

### 11.2 对比度要求

- 所有文字满足 WCAG AA 标准 (4.5:1)
- Badge 背景/文字对比度符合要求
- 使用 `muted-foreground` 时注意背景对比

### 11.3 交互反馈

```tsx
// 禁用状态
disabled:pointer-events-none disabled:opacity-50

// 加载状态
<span className="sr-only">加载中...</span>

// 操作确认
<DropdownMenuItem
  variant="destructive"
  onClick={() => {
    if (confirm("确定删除?")) {
      onDelete(id)
    }
  }}
>
```

---

## 12. 文件结构建议

```
admin-web/src/app/
├── bills/
│   ├── flows/
│   │   ├── page.tsx              # 流水管理主页面
│   │   ├── components/
│   │   │   ├── flows-table.tsx   # 流水表格组件
│   │   │   ├── flows-filters.tsx # 筛选区组件
│   │   │   ├── flows-detail-dialog.tsx # 详情弹窗
│   │   │   └── index.ts
│   │   └── types/
│   │       └── flows.ts          # 类型定义
│   └── consumptions/
│       ├── page.tsx              # 消费管理主页面
│       ├── components/
│       │   ├── consumptions-table.tsx
│       │   ├── consumptions-filters.tsx
│       │   ├── consumptions-detail-dialog.tsx
│       │   └── index.ts
│       └── types/
│           └── consumptions.ts
└── menus/
    ├── page.tsx                  # 菜单列表主页面
    ├── assign/
    │   └── page.tsx              # 角色分配页面
    ├── components/
    │   ├── menus-table.tsx
    │   ├── menus-form-dialog.tsx # 添加/编辑弹窗
    │   ├── menus-tree.tsx        # 菜单树组件
    │   └── index.ts
    └── types/
        └── menus.ts
```

---

## 13. 类型定义参考

```typescript
// 流水记录类型
interface FlowRecord {
  id: number
  orderNo: string
  userId: number
  userName: string
  userPhone: string
  rechargeType: 'recharge' | 'refund'
  paymentMethod: 'wechat' | 'alipay' | 'bankcard' | 'other'
  amount: number
  points: number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  createdAt: string
}

// 消费记录类型
interface ConsumptionRecord {
  id: number
  userId: number
  userName: string
  userPhone: string
  consumptionType: 'vip' | 'props' | 'service' | 'other'
  pointsSpent: number
  pointsRemaining: number
  relatedBusinessId: string
  description: string
  createdAt: string
}

// 菜单类型
interface MenuItem {
  id: number
  name: string
  code: string
  icon: string
  path: string
  parentId: number | null
  sort: number
  status: 'active' | 'inactive'
  children?: MenuItem[]
}
```

---

## 14. 总结

本设计规范确保:

1. **一致性**: 所有页面遵循统一的布局、间距和样式规范
2. **可复用性**: 组件库充分利用，筛选、表格、弹窗等模式统一
3. **可访问性**: 遵循 WCAG AA 标准，支持键盘导航和屏幕阅读器
4. **响应式**: 支持桌面端、平板端和移动端
5. **类型安全**: 所有组件和函数使用 TypeScript 类型定义

请在开发过程中严格遵循本规范，如有问题请联系UI设计师。
