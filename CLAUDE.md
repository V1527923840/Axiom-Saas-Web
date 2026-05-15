# Admin Web - 技术文档

## 项目概述

基于 Vite + React + TypeScript 的管理后台应用，使用 React Router 路由、Zustand 状态管理、Tailwind CSS + shadcn/ui UI 组件库。

## 技术栈

### 核心框架
- **构建工具**: Vite 7.3
- **前端框架**: React 19.2 + TypeScript 5.9
- **路由**: React Router v7.11
- **状态管理**: Zustand 5.0 + React Context

### UI 与样式
- **UI 组件库**: shadcn/ui (基于 Radix UI primitives)
- **样式**: Tailwind CSS 4.1 + CSS Variables
- **图标**: Lucide React
- **动画**: Tailwind CSS Animate, Framer Motion 兼容

### 表单与数据
- **表单**: React Hook Form 7.69 + Zod 4.3 (验证)
- **表格**: TanStack Table v8
- **日期选择**: React Day Picker + date-fns

### 其他重要依赖
- **拖拽**: @dnd-kit/core/modifiers/sortable
- **图表**: Recharts 3.6
- **主题**: next-themes (Dark mode 支持)
- **命令面板**: cmdk (Command palette)
- **表单弹窗**: Vaul (Drawer/Dialog)
- **HTTP**: 原生 Fetch (自定义封装)

## 目录结构

```
admin-web/
├── src/
│   ├── app/                    # 页面组件 (Dashboard、Settings、Errors 等)
│   │   ├── auth/              # 认证页面
│   │   ├── dashboard/         # 主仪表盘
│   │   ├── errors/            # 错误页面 (401/403/404/500 等)
│   │   ├── settings/          # 设置页面
│   │   └── ...
│   ├── components/            # 共享组件
│   │   ├── ui/               # shadcn/ui 原始组件
│   │   ├── data-table/        # TanStack Table 封装
│   │   ├── layouts/           # 布局组件
│   │   ├── router/            # 路由配置 (app-router.tsx)
│   │   ├── app-sidebar.tsx    # 侧边栏
│   │   ├── nav-*.tsx         # 导航组件
│   │   └── providers.tsx      # 全局 Provider 聚合
│   ├── contexts/              # React Context providers
│   │   ├── auth-context.tsx   # 认证状态 (token, user, login/logout)
│   │   ├── menu-context.tsx   # 菜单树状态
│   │   ├── sidebar-context.tsx # 侧边栏状态
│   │   └── theme-context.tsx  # 主题状态
│   ├── features/              # 功能模块 (按领域组织)
│   │   ├── auth/             # 认证功能
│   │   ├── bills/            # 账单模块 (flows/consumptions)
│   │   ├── categories/       # 分类管理
│   │   ├── content/          # 内容管理 (daily-news/audio-reports 等)
│   │   ├── etl/              # ETL 管理
│   │   ├── menus/            # 菜单管理
│   │   ├── plans/            # 订阅计划
│   │   ├── subscriptions/     # 用户订阅
│   │   └── users/            # 用户管理
│   ├── hooks/                 # 共享自定义 hooks
│   ├── lib/                   # 工具库
│   │   ├── api.ts            # API 请求封装 (get/post/put/patch/del + CRUD factory)
│   │   ├── schemas/          # Zod 验证 schemas
│   │   └── utils.ts          # 通用工具函数 (cn 等)
│   ├── services/             # API 服务模块
│   │   ├── auth.ts           # 认证 API
│   │   └── content.ts       # 内容 API
│   ├── types/                # 共享类型定义
│   ├── config/               # 配置
│   │   └── routes.tsx        # 路由配置 (所有路由定义)
│   └── utils/                # 工具函数
│       └── analytics.ts      # GTM 初始化
├── .env.example             # 环境变量示例
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置引用
├── tsconfig.app.json        # 应用 TypeScript 配置
├── eslint.config.js         # ESLint 配置
└── package.json             # 依赖配置
```

### Feature 模块结构

每个功能模块遵循一致的结构：

```
features/[feature-name]/
├── types/
│   └── index.ts           # 类型定义
├── hooks/
│   └── use-[feature].ts   # 数据获取 hooks
├── components/
│   ├── [feature]-columns.tsx  # Table 列定义
│   ├── [feature]-form.tsx     # 表单组件
│   └── [feature]-dialog.tsx  # Dialog 封装
└── [feature-name]/
    └── page.tsx           # 页面入口
```

## 代码规范

### TypeScript 规范
- 启用严格模式 (`strict: true`)
- 使用 `verbatimModuleSyntax`: 必须使用 `import type` 导入类型
- `noUnusedLocals: true` / `noUnusedParameters: true`: 不允许未使用的变量
- 路径别名: `@/*` 指向 `src/*`

### 命名规范
- **组件**: PascalCase (如 `UserProfile`)
- **Hooks**: camelCase，以 `use` 开头 (如 `useUsers`)
- **类型**: PascalCase，可加前缀 (如 `UserInfo`, `ApiResponse<T>`)
- **文件**:
  - 组件/页面: PascalCase 或 kebab-case (如 `user-profile.tsx`)
  - Hooks/工具: camelCase (如 `use-auth.ts`)
  - 配置文件: camelCase 或 kebab-case

### 提交规范
使用语义化提交信息:
```
feat: [Story ID] - [功能描述]       # 新功能
fix: [描述]                         # Bug 修复
refactor: [描述]                    # 重构
docs: [描述]                        # 文档更新
chore: [描述]                       # 构建/工具变更
test: [描述]                        # 测试
```

## 环境变量规范

```bash
# .env.example 中的变量

# API 基础 URL (默认: http://localhost:3000/api)
VITE_API_BASE_URL=

# Google Tag Manager ID (可选，仅生产环境启用分析)
VITE_GTM_ID=

# 部署基础路径 (子目录部署时使用，如 /templates/dashboard/)
VITE_BASENAME=
```

**注意**: 所有环境变量必须以 `VITE_` 前缀开头，才能在客户端代码中通过 `import.meta.env.VITE_*` 访问。

## API 客户端模式

`src/lib/api.ts` 提供统一 API 请求封装:

```typescript
// HTTP 方法
get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>
post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>
put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>
patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>
del<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>

// CRUD 工厂
createCrudApi<T>(endpoint: string, options?: RequestOptions)

// RequestOptions
interface RequestOptions {
  token?: string           // Auth token
  params?: Record<string, string | number | boolean | undefined>  // Query params
}
```

**错误处理**:
- 401 响应自动清除 token 并跳转登录页
- API 错误抛出 `ApiRequestError`，包含 `statusCode` 和 `code`
- 网络错误抛出 `ApiRequestError`，code 为 `NETWORK_ERROR`

**分页转换**: UI 使用 0-based 分页，API 使用 1-based，调用时需转换。

## Context 模式

使用 React Context 管理全局状态:

```typescript
interface MenuContextType {
  menus: MenuTreeNode[]
  loading: boolean
  error: string | null
  fetchMenuTree: () => Promise<MenuTreeNode[]>
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

export function MenuProvider({ children }: { children: ReactNode }) {
  // 实现...
}

export function useMenusContext() {
  const context = useContext(MenuContext)
  if (context === undefined) {
    throw new Error("useMenusContext must be used within a MenuProvider")
  }
  return context
}
```

## 常用开发命令

```bash
# 开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 预览生产构建
npm run preview
```

## 开发约束与注意事项

### 重要约定

1. **环境变量**: 客户端变量必须 `VITE_` 前缀，参考 `.env.example`

2. **分页**: UI 使用 0-based，API 使用 1-based
   ```typescript
   // 转换示例
   const apiPage = page + 1
   const response = await get("/endpoint", { params: { page: apiPage, limit: 10 } })
   ```

3. **路由保护**: 使用 `<ProtectedRoute roles={['Admin']}>` 组件保护需要特定角色的路由

4. **API 响应处理**: 后端返回结构可能变化，需兼容处理:
   ```typescript
   const data = Array.isArray(responseData)
     ? responseData
     : (responseData?.data ?? [])
   ```

5. **Provider 顺序**: `Providers` 中嵌套顺序重要:
   - `ThemeProvider` → `AuthProvider` → `SidebarConfigProvider` → `MenuProvider`

6. **Tree 结构构建**: 使用 `buildMenuTree` 函数将平铺菜单转换为树结构

### UI 组件库 (shadcn/ui)

位于 `src/components/ui/`，基于 Radix UI，包含:
- 基础组件: Button, Input, Label, Textarea, Checkbox, Switch, Toggle
- 导航: NavigationMenu, Tabs, Collapsible, Sheet, Sidebar
- 数据展示: Table, Card, Badge, Avatar, Skeleton, Progress
- 反馈: Dialog, Drawer, Popover, Tooltip, HoverCard, Sonner (Toast)
- 布局: Separator, ScrollArea, Resizable, Breadcrumb
- 表单: Form, Select, RadioGroup, Calendar, Chart

### 功能模块一览

| 模块 | 路径 | 说明 |
|------|------|------|
| bills/flows | `/bills/flows` | 支付流水 (Admin) |
| bills/consumptions | `/bills/consumptions` | 消费记录 (Admin) |
| menus | `/menus` | 菜单管理 (Admin) |
| menus/assign | `/menus/assign` | 菜单分配 (Admin) |
| users | `/users` | 用户管理 |
| plans | `/plans` | 订阅计划 |
| subscriptions | `/subscriptions` | 用户订阅 |
| content/* | `/content/*` | 内容管理 |
| etl | `/etl` | ETL 管理 (Admin) |
| categories | `/categories` | 分类管理 (Admin) |
| oss-browser | `/oss-browser` | OSS文件浏览器 (Admin) |
| scrape-log | `/scrape-logs` | 爬虫日志管理 (Admin) |