'use client'

import React, { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { User, Mail, Phone, Link, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/axios'
import type { ManagerRequest } from '@/types'

export default function ProfilePage() {
  const { user, updateUser, requestManagerAccess } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [managerRequest, setManagerRequest] = useState<ManagerRequest | null>(null)
  const [formData, setFormData] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
    email: user?.email || '',
    github_username: user?.github_username || '',
  })
  const [requestReason, setRequestReason] = useState('')

  useEffect(() => {
    setFormData({
      username: user?.username || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone_number: user?.phone_number || '',
      email: user?.email || '',
      github_username: user?.github_username || '',
    })
  }, [user])

  useEffect(() => {
    const fetchManagerRequest = async () => {
      try {
        const res = await api.get<ManagerRequest>('/accounts/manager-request/')
        setManagerRequest(res.data)
      } catch (error) {
        // No request exists
        setManagerRequest(null)
      }
    }

    fetchManagerRequest()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await updateUser(formData)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRequestManager = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestReason.trim()) return

    setIsRequesting(true)
    try {
      await requestManagerAccess({ reason: requestReason })
      // Refresh manager request
      const res = await api.get<ManagerRequest>('/accounts/manager-request/')
      setManagerRequest(res.data)
      setRequestReason('')
    } catch (error) {
      console.error('Failed to request manager access:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  if (!user) {
    return (
      <MainLayout breadcrumb={['Profile']}>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout breadcrumb={['Profile']}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-2xl font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <div className="flex items-center gap-2 mt-1">
                {user.is_manager ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle size={14} className="text-green-400" />
                    <span className="text-green-400 text-sm">Manager</span>
                  </div>
                ) : managerRequest ? (
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-yellow-400" />
                    <span className="text-yellow-400 text-sm">Pending approval</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-gray-400" />
              <span className="text-gray-400">Name:</span>
              <span>{user.first_name} {user.last_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail size={16} className="text-gray-400" />
              <span className="text-gray-400">Email:</span>
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone size={16} className="text-gray-400" />
              <span className="text-gray-400">Phone:</span>
              <span>{user.phone_number}</span>
            </div>
            {user.github_username && (
              <div className="flex items-center gap-2 text-sm">
                <Link size={16} className="text-gray-400" />
                <span className="text-gray-400">GitHub:</span>
                <span>{user.github_username}</span>
              </div>
            )}
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={isSaving}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                disabled={isSaving}
              />
              <Input
                label="Last Name"
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              disabled={isSaving}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isSaving}
            />
            <Input
              label="GitHub Username"
              type="text"
              value={formData.github_username}
              onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
              disabled={isSaving}
            />
            <Button type="submit" isLoading={isSaving}>
              Save Changes
            </Button>
          </form>
        </div>

        {/* Manager Request Section */}
        {!user.is_manager && (
          <div className="bg-surface border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Manager Access</h2>
            {managerRequest ? (
              <div className="bg-background border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Your Request</span>
                  <StatusBadge variant={managerRequest.status}>{managerRequest.status}</StatusBadge>
                </div>
                <p className="text-gray-400 text-sm mb-2">{managerRequest.reason}</p>
                <p className="text-xs text-gray-500">
                  Submitted: {new Date(managerRequest.created_at).toLocaleString()}
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestManager} className="space-y-4">
                <p className="text-gray-400 text-sm mb-4">
                  Request manager access to create and manage projects.
                </p>
                <Textarea
                  label="Reason for requesting manager access"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  rows={4}
                  placeholder="Explain why you need manager access..."
                  required
                  disabled={isRequesting}
                />
                <Button type="submit" isLoading={isRequesting}>
                  Request Access
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}