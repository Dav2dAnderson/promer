'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { LoginRequest } from '@/types'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(formData)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-accent text-white">✦</div><p className="eyebrow mb-3">Promer / Workspace</p><h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1><p className="mt-2 text-sm text-zinc-400">Sign in to continue to your projects.</p></div>
        <div className="surface-panel p-7">
          
          {error && <ErrorMessage error={error} />}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={isLoading}
            />
            
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
            />
            
            <Button type="submit" isLoading={isLoading} className="w-full">
              Sign In
            </Button>
          </form>
          
          <p className="mt-6 text-center text-sm text-zinc-500">
            Don't have an account?{' '}
            <a href="/register" className="text-accent hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
