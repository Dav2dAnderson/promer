'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { RegisterRequest } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    password1: '',
    password2: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password1 !== formData.password2) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      await register(formData)
      router.push('/login')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 
        Object.values(err.response?.data || {}).flat().join(', ') ||
        'Registration failed. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-border rounded-lg p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
          
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
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                disabled={isLoading}
              />
              
              <Input
                label="Last Name"
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              required
              disabled={isLoading}
            />
            
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
            />
            
            <Input
              label="Password"
              type="password"
              value={formData.password1}
              onChange={(e) => setFormData({ ...formData, password1: e.target.value })}
              required
              disabled={isLoading}
            />
            
            <Input
              label="Confirm Password"
              type="password"
              value={formData.password2}
              onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
              required
              disabled={isLoading}
            />
            
            <Button type="submit" isLoading={isLoading} className="w-full">
              Sign Up
            </Button>
          </form>
          
          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <a href="/login" className="text-accent hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}