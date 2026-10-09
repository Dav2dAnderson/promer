'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, isLoading, updateUser } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login')
    } else if (user.phone_number?.trim()) {
      router.replace('/dashboard')
    }
  }, [isLoading, router, user])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedPhoneNumber = phoneNumber.trim()

    if (!normalizedPhoneNumber) {
      setError('Enter your phone number to continue.')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      await updateUser({ phone_number: normalizedPhoneNumber })
      router.replace('/dashboard')
    } catch {
      setError('We could not save your phone number. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !user || user.phone_number?.trim()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="eyebrow mb-3">Promer / Account setup</p>
          <h1 className="text-2xl font-semibold tracking-tight">Complete your profile</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Add your phone number to finish setting up your account.
          </p>
        </div>

        <section className="surface-panel p-7">
          {error && <ErrorMessage error={error} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Phone Number"
              type="tel"
              autoComplete="tel"
              maxLength={20}
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
              disabled={isSaving}
              autoFocus
            />
            <Button type="submit" isLoading={isSaving} className="w-full">
              Save and continue
            </Button>
          </form>
        </section>
      </div>
    </main>
  )
}