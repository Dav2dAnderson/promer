'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import api, { getToken, setToken } from '@/lib/axios'
import type { User, LoginRequest, RegisterRequest, AuthResponse, CreateManagerRequest } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => Promise<void>
  requestManagerAccess: (data: CreateManagerRequest) => Promise<void>
  githubLogin: () => void
  authError: string | null
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // Check for OAuth errors in URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const error = urlParams.get('error')

      if (error === 'github_denied') {
        setAuthError('GitHub authorization was denied')
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname)
      } else if (error === 'auth_failed') {
        setAuthError('GitHub authentication failed')
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    // Check if user is already logged in by fetching current user
    const checkAuth = async () => {
      const token = getToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await api.get<User>('/accounts/user/')
        setUser(response.data)
      } catch (error) {
        if (getToken() === token) {
          setToken('')
          setUser(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (credentials: LoginRequest) => {
    const response = await api.post<AuthResponse>('/accounts/login/', credentials)
    const { access, user: userData } = response.data

    setToken(access)
    setUser(userData)
  }

  const register = async (data: RegisterRequest) => {
    await api.post('/accounts/registration/', data)
  }

  const logout = async () => {
    try {
      await api.post('/accounts/logout/')
    } catch (error) {
      // Ignore logout errors
    } finally {
      setToken('')
      setUser(null)
    }
  }

  const updateUser = async (updates: Partial<User>) => {
    const response = await api.patch<User>('/accounts/user/', updates)
    setUser(response.data)
  }

  const requestManagerAccess = async (data: CreateManagerRequest) => {
    await api.post('/accounts/manager-request/', data)
  }

  const githubLogin = () => {
    // Redirect to backend OAuth start endpoint
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    window.location.href = `${backendUrl}/api/github/login/`
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    requestManagerAccess,
    githubLogin,
    authError,
    setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}