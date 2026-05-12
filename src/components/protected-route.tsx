"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useLocation, Navigate } from "react-router-dom"

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

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

  // Check if user has required role
  if (roles && roles.length > 0) {
    const userRole = user?.role?.name
    if (!userRole || !roles.includes(userRole)) {
      return <Navigate to="/errors/forbidden" replace />
    }
  }

  return <>{children}</>
}
