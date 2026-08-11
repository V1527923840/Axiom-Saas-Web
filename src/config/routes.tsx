import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/protected-route'

// Lazy load components for better performance
const Landing = lazy(() => import('@/app/landing/page'))
const Dashboard = lazy(() => import('@/app/dashboard/page'))
const Dashboard2 = lazy(() => import('@/app/dashboard-2/page'))
const DashboardSummaries = lazy(() => import('@/app/dashboard-summaries/page'))
const Mail = lazy(() => import('@/app/mail/page'))
const Tasks = lazy(() => import('@/app/tasks/page'))
const Chat = lazy(() => import('@/app/chat/page'))
const Calendar = lazy(() => import('@/app/calendar/page'))
const FAQs = lazy(() => import('@/app/faqs/page'))
const Pricing = lazy(() => import('@/app/pricing/page'))

// Auth pages
const SignIn = lazy(() => import('@/features/auth/sign-in/page'))
const SignUp = lazy(() => import('@/features/auth/sign-up/page'))
const ForgotPassword = lazy(() => import('@/features/auth/forgot-password/page'))

// Error pages
const Unauthorized = lazy(() => import('@/app/errors/unauthorized/page'))
const Forbidden = lazy(() => import('@/app/errors/forbidden/page'))
const NotFound = lazy(() => import('@/app/errors/not-found/page'))
const InternalServerError = lazy(() => import('@/app/errors/internal-server-error/page'))
const UnderMaintenance = lazy(() => import('@/app/errors/under-maintenance/page'))

// Content pages
const AudioInterpretation = lazy(() => import('@/features/content/audio-interpretation/page'))
const Intelligence = lazy(() => import('@/features/content/intelligence/page'))
const ResearchAnalysis = lazy(() => import('@/features/content/research-analysis/page'))
const IndustryChains = lazy(() => import('@/features/industry-chain/page'))

// ETL pages
const EtlManagement = lazy(() => import('@/features/etl/page'))

// OSS pages
const OssBrowser = lazy(() => import('@/features/oss-browser/page'))

// Categories pages
const CategoriesManagement = lazy(() => import('@/features/categories/page'))

// Users pages
const UsersManagement = lazy(() => import('@/features/users/users/page'))

// Plans pages
const PlansManagement = lazy(() => import('@/features/plans/plans/page'))

// Subscriptions pages
const SubscriptionsManagement = lazy(() => import('@/features/subscriptions/subscriptions/page'))

// Bills pages
const PaymentFlows = lazy(() => import('@/features/bills/flows/page'))
const Consumptions = lazy(() => import('@/features/bills/consumptions/page'))

// Scrape Log pages
const ScrapeLogs = lazy(() => import('@/features/scrape-log/page'))

// Parse Tasks pages
const ParseTasks = lazy(() => import('@/features/parse-tasks/page'))
const ParseTaskDetail = lazy(() => import('@/features/parse-tasks/task-detail/page'))

// Versions pages
const Versions = lazy(() => import('@/features/versions/page'))

// Roles pages
const Roles = lazy(() => import('@/features/roles/page'))

// Menus pages
const Menus = lazy(() => import('@/features/menus/menus/page'))

// Vibe Trading pages
const VibeTrading = lazy(() => import('@/features/vibe-trading/page'))

// Settings pages
const UserSettings = lazy(() => import('@/app/settings/user/page'))
const AccountSettings = lazy(() => import('@/app/settings/account/page'))
const BillingSettings = lazy(() => import('@/app/settings/billing/page'))
const AppearanceSettings = lazy(() => import('@/app/settings/appearance/page'))
const NotificationSettings = lazy(() => import('@/app/settings/notifications/page'))
const ConnectionSettings = lazy(() => import('@/app/settings/connections/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  // Default route - redirect to dashboard
  {
    path: "/",
    element: <Navigate to="dashboard" replace />
  },

  // Landing Page
  {
    path: "/landing",
    element: <Landing />
  },

  // Protected Application Routes
  {
    path: "/dashboard",
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>
  },
  {
    path: "/dashboard-2",
    element: <ProtectedRoute><Dashboard2 /></ProtectedRoute>
  },
  {
    path: "/dashboard/summaries",
    element: <ProtectedRoute menuPaths={['/dashboard/summaries']}><DashboardSummaries /></ProtectedRoute>
  },
  {
    path: "/mail",
    element: <ProtectedRoute><Mail /></ProtectedRoute>
  },
  {
    path: "/tasks",
    element: <ProtectedRoute><Tasks /></ProtectedRoute>
  },
  {
    path: "/chat",
    element: <ProtectedRoute><Chat /></ProtectedRoute>
  },
  {
    path: "/calendar",
    element: <ProtectedRoute><Calendar /></ProtectedRoute>
  },

  // Content Management Routes
  {
    path: "/content/audio-interpretation",
    element: <ProtectedRoute><AudioInterpretation /></ProtectedRoute>
  },
  {
    path: "/content/intelligence",
    element: <ProtectedRoute><Intelligence /></ProtectedRoute>
  },
  {
    path: "/content/research-analysis",
    element: <ProtectedRoute><ResearchAnalysis /></ProtectedRoute>
  },
  {
    path: "/content/industry-chains",
    element: <ProtectedRoute><IndustryChains /></ProtectedRoute>
  },

  // ETL Management Routes - menu-based permission
  {
    path: "/etl",
    element: <ProtectedRoute menuPaths={['/etl']}><EtlManagement /></ProtectedRoute>
  },

  // OSS Browser Routes - menu-based permission
  {
    path: "/oss-browser",
    element: <ProtectedRoute menuPaths={['/oss-browser']}><OssBrowser /></ProtectedRoute>
  },

  // Categories Management Routes - menu-based permission
  {
    path: "/categories",
    element: <ProtectedRoute menuPaths={['/categories']}><CategoriesManagement /></ProtectedRoute>
  },

  // User Management Routes
  {
    path: "/users",
    element: <ProtectedRoute><UsersManagement /></ProtectedRoute>
  },

  // Plan Management Routes
  {
    path: "/plans",
    element: <ProtectedRoute><PlansManagement /></ProtectedRoute>
  },

  // Subscription Management Routes
  {
    path: "/subscriptions",
    element: <ProtectedRoute><SubscriptionsManagement /></ProtectedRoute>
  },

  // Bills Management Routes - menu-based permission
  {
    path: "/bills/flows",
    element: <ProtectedRoute menuPaths={['/bills/flows']}><PaymentFlows /></ProtectedRoute>
  },
  {
    path: "/bills/consumptions",
    element: <ProtectedRoute menuPaths={['/bills/consumptions']}><Consumptions /></ProtectedRoute>
  },

  // Scrape Log Management Routes - menu-based permission
  {
    path: "/scrape-logs",
    element: <ProtectedRoute menuPaths={['/scrape-logs']}><ScrapeLogs /></ProtectedRoute>
  },

  // Parse Tasks Management Routes
  {
    path: "/parse/tasks",
    element: <ProtectedRoute><ParseTasks /></ProtectedRoute>
  },
  {
    path: "/parse/tasks/:taskId",
    element: <ProtectedRoute><ParseTaskDetail /></ProtectedRoute>
  },

  // Versions Management Routes
  {
    path: "/versions",
    element: <ProtectedRoute><Versions /></ProtectedRoute>
  },

  // Roles Management Routes
  {
    path: "/roles",
    element: <ProtectedRoute><Roles /></ProtectedRoute>
  },

  // Menus Management Routes - menu-based permission
  {
    path: "/menus",
    element: <ProtectedRoute menuPaths={['/menus']}><Menus /></ProtectedRoute>
  },

  // Vibe Trading Routes - menu-based permission
  {
    path: "/vibe-trading",
    element: <ProtectedRoute menuPaths={['/vibe-trading']}><VibeTrading /></ProtectedRoute>
  },

  // Public Pages
  {
    path: "/faqs",
    element: <FAQs />
  },
  {
    path: "/pricing",
    element: <Pricing />
  },

  // Authentication Routes
  {
    path: "/auth/sign-in",
    element: <SignIn />
  },
  {
    path: "/auth/sign-up",
    element: <SignUp />
  },
  {
    path: "/auth/forgot-password",
    element: <ForgotPassword />
  },

  // Error Pages
  {
    path: "/errors/unauthorized",
    element: <Unauthorized />
  },
  {
    path: "/errors/forbidden",
    element: <Forbidden />
  },
  {
    path: "/errors/not-found",
    element: <NotFound />
  },
  {
    path: "/errors/internal-server-error",
    element: <InternalServerError />
  },
  {
    path: "/errors/under-maintenance",
    element: <UnderMaintenance />
  },

  // Protected Settings Routes
  {
    path: "/settings/user",
    element: <ProtectedRoute><UserSettings /></ProtectedRoute>
  },
  {
    path: "/settings/account",
    element: <ProtectedRoute><AccountSettings /></ProtectedRoute>
  },
  {
    path: "/settings/billing",
    element: <ProtectedRoute><BillingSettings /></ProtectedRoute>
  },
  {
    path: "/settings/appearance",
    element: <ProtectedRoute><AppearanceSettings /></ProtectedRoute>
  },
  {
    path: "/settings/notifications",
    element: <ProtectedRoute><NotificationSettings /></ProtectedRoute>
  },
  {
    path: "/settings/connections",
    element: <ProtectedRoute><ConnectionSettings /></ProtectedRoute>
  },

  // Catch-all route for 404
  {
    path: "*",
    element: <NotFound />
  }
]