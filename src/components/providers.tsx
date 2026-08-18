"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarConfigProvider } from "@/contexts/sidebar-context"
import { AuthProvider } from "@/contexts/auth-context"
import { MenuProvider } from "@/contexts/menu-context"
import { Toaster } from "@/components/ui/sonner"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // ★ Skill Plaza (and future data-driven features) needs react-query.
  // Lazy-construct so each browser tab keeps its own client (HMR safe).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <AuthProvider>
          <SidebarConfigProvider>
            <MenuProvider>
              {children}
              <Toaster />
            </MenuProvider>
          </SidebarConfigProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}