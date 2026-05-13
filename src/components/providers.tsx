"use client"

import { type ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarConfigProvider } from "@/contexts/sidebar-context"
import { AuthProvider } from "@/contexts/auth-context"
import { MenuProvider } from "@/contexts/menu-context"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <SidebarConfigProvider>
          <MenuProvider>
            {children}
          </MenuProvider>
        </SidebarConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}