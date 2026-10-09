'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { setToken } from '@/lib/axios'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { setUser } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session key from URL
        const urlParams = new URLSearchParams(window.location.search)
        const session = urlParams.get('session')

        if (!session) {
          throw new Error('Session key missing')
        }

        // Call the backend token endpoint
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/token/?session=${session}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to retrieve tokens')
        }

        const data = await response.json()

        // Store the access token
        setToken(data.access)

        // Set user data
        setUser(data.user)

        // Collect required account details before entering the app.
        router.push(data.user.phone_number?.trim() ? '/dashboard' : '/complete-profile')
      } catch (error) {
        console.error('OAuth callback error:', error)
        router.push('/login?error=auth_failed')
      }
    }

    handleCallback()
  }, [router, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-zinc-400">Completing authentication...</p>
      </div>
    </div>
  )
}
