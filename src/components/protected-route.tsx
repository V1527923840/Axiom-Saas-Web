"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useLocation, Navigate } from "react-router-dom"
import { useMenusContext } from "@/contexts/menu-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
  menuPaths?: string[] // List of menu paths that grant access to this route
}

export function ProtectedRoute({ children, roles, menuPaths }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const { menus } = useMenusContext()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the attempted URL for redirecting after login
      sessionStorage.setItem("redirectUrl", location.pathname)
    }
  }, [isLoading, isAuthenticated, location.pathname])

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" replace />
  }

  // Admin (role.id === 1) has unrestricted access to all routes
  if (user?.role?.id === 1) {
    return <>{children}</>
  }

  // Check menu-based permissions (dynamic permission system)
  if (menuPaths && menuPaths.length > 0) {
    const userMenuPaths = menus.map(m => m.path).filter(Boolean) as string[]
    const hasMenuAccess = menuPaths.some(path => userMenuPaths.includes(path))
    if (hasMenuAccess) {
      return <>{children}</>
    }
  }

  // Fallback: Check if user has required role
  if (roles && roles.length > 0) {
    const userRole = user?.role?.name
    if (!userRole || !roles.includes(userRole)) {
      return <Navigate to="/errors/forbidden" replace />
    }
  }

  return <>{children}</>
}
