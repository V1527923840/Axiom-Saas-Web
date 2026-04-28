"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useLocation, Navigate } from "react-router-dom"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
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

  return <>{children}</>
}