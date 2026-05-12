import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { authApi, type User, type LoginResponse } from "@/services/auth"
import { UnauthorizedError } from "@/lib/api"

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "auth_token"
const REFRESH_TOKEN_KEY = "auth_refresh_token"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (storedToken) {
      setToken(storedToken)
      loadUser(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  async function loadUser(token: string) {
    try {
      const response = await authApi.getMe(token)
      setUser(response.data as User)
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        setToken(null)
        setUser(null)
        navigate("/auth/sign-in")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password)
    const loginData = response.data as LoginResponse
    localStorage.setItem(TOKEN_KEY, loginData.token)
    localStorage.setItem(REFRESH_TOKEN_KEY, loginData.refreshToken)
    setToken(loginData.token)
    setUser(loginData.user)
    navigate("/dashboard")
  }

  async function signup(firstName: string, lastName: string, email: string, password: string) {
    await authApi.register(firstName, lastName, email, password)
    navigate("/auth/sign-in")
  }

  function logout() {
    if (token) {
      authApi.logout(token).catch(() => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setToken(null)
    setUser(null)
    navigate("/auth/sign-in")
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}