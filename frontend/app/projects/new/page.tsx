'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/axios'
import type { CreateProjectRequest } from '@/types'

type GitHubRepository = {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  url: string
}

export default function NewProjectPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    is_public: false,
  })
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [selectedRepository, setSelectedRepository] = useState('')
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(true)
  const [repositoryError, setRepositoryError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    api.get<GitHubRepository[]>('/github/repos/')
      .then((res) => {
        if (isActive) setRepositories(res.data)
      })
      .catch((err: any) => {
        if (isActive) {
          setRepositoryError(
            err.response?.data?.error ||
            err.response?.data?.detail ||
            'Could not load GitHub repositories.'
          )
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingRepositories(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      if (selectedRepository) {
        const res = await api.post('/github/connect-repo/', {
          repo_full_name: selectedRepository,
          project_name: formData.name.trim(),
          description: formData.description.trim(),
          is_public: formData.is_public,
        })
        router.push(`/projects/${res.data.project.slug}`)
      } else {
        const res = await api.post('/management/projects/', formData)
        router.push(`/projects/${res.data.slug}`)
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to create project. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user?.is_manager) {
    return (
      <MainLayout breadcrumb={['Projects', 'New Project']}>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-gray-400">You don't have permission to create projects.</p>
          <Button variant="secondary" onClick={() => router.push('/projects')}>
            Back to Projects
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout breadcrumb={['Projects', 'New Project']}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => router.push('/projects')}
            className="gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Create New Project</h1>
        </div>

        {/* Form */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name..."
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  required
                />
              </div>
              <div>
                <label htmlFor="github_repository" className="block text-sm font-medium text-gray-300 mb-2">
                  GitHub Repository
                </label>
                <select
                  id="github_repository"
                  value={selectedRepository}
                  onChange={(e) => {
                    const repository = repositories.find((item) => item.full_name === e.target.value)
                    setSelectedRepository(e.target.value)
                    if (repository) {
                      setFormData((current) => ({
                        ...current,
                        name: repository.name,
                        description: repository.description || '',
                      }))
                    }
                  }}
                  disabled={isLoadingRepositories || repositories.length === 0}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingRepositories ? 'Loading repositories...' : 'Create without a repository'}
                  </option>
                  {repositories.map((repository) => (
                    <option key={repository.id} value={repository.full_name}>
                      {repository.full_name}{repository.private ? ' (Private)' : ' (Public)'}
                    </option>
                  ))}
                </select>
                {repositoryError && (
                  <p className="mt-2 text-sm text-amber-400">
                    GitHub repositories unavailable: {repositoryError}
                  </p>
                )}
                {!isLoadingRepositories && !repositoryError && repositories.length === 0 && (
                  <p className="mt-2 text-sm text-gray-400">No GitHub repositories are available for this account.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Describe your project..."
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none transition-all"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-background text-accent focus:ring-accent"
                />
                <label htmlFor="is_public" className="text-sm text-gray-300">
                  Make this project public
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/projects')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Create Project
              </Button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  )
}
