'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import api, { setToken, getToken } from '@/lib/axios'
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in by fetching current user
    const checkAuth = async () => {
      const token = getToken()
      if (token) {
        try {
          const response = await api.get<User>('/accounts/user/')
          setUser(response.data)
        } catch (error) {
          // Token might be invalid, clear it
          setToken('')
          setUser(null)
        }
      }
      setIsLoading(false)
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

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    requestManagerAccess,
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