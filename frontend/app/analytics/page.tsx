'use client'

import React, { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { BarChart3, Folder, CheckSquare, Send, TrendingUp, Users } from 'lucide-react'
import api from '@/lib/axios'
import type { AnalyticsOverviewResponse, MemberAnalyticsResponse, ProjectAnalyticsResponse } from '@/types'

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null)
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalyticsResponse | null>(null)
  const [memberAnalytics, setMemberAnalytics] = useState<MemberAnalyticsResponse[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const overviewRes = await api.get<AnalyticsOverviewResponse>('/analytics/overview/')
        setOverview(overviewRes.data)

        const projectsRes = await api.get<{ slug: string }[]>('/management/projects/', {
          params: { my_projects: true },
        })

        const firstProjectSlug = projectsRes.data[0]?.slug

        if (firstProjectSlug) {
          const [projectRes, membersRes] = await Promise.all([
            api.get<ProjectAnalyticsResponse>(`/analytics/projects/${firstProjectSlug}/`),
            api.get<MemberAnalyticsResponse[]>(`/analytics/projects/${firstProjectSlug}/members/`),
          ])

          setProjectAnalytics(projectRes.data)
          setMemberAnalytics(membersRes.data)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
      <MainLayout breadcrumb={['Analytics']}>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout breadcrumb={['Analytics']}>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">Performance / Insights</p>
            <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
            <p className="mt-2 text-zinc-400">
              Monitor delivery, task completion, and team momentum from one view.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-2 text-sm text-cyan">
            <BarChart3 size={16} />
            Live workspace metrics
          </div>
        </div>

        {!overview ? (
          <EmptyState message="Analytics are unavailable for this account" icon={<BarChart3 size={48} />} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="surface-panel p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow">Projects</p>
                    <p className="mt-3 text-3xl font-semibold">{overview.projects.total}</p>
                  </div>
                  <Folder className="text-cyan" size={20} />
                </div>
              </div>
              <div className="surface-panel p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow">Completed tasks</p>
                    <p className="mt-3 text-3xl font-semibold">{overview.tasks.completed}</p>
                  </div>
                  <CheckSquare className="text-cyan" size={20} />
                </div>
              </div>
              <div className="surface-panel p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow">Completion rate</p>
                    <p className="mt-3 text-3xl font-semibold">{overview.tasks.completion_rate}%</p>
                  </div>
                  <TrendingUp className="text-cyan" size={20} />
                </div>
              </div>
              <div className="surface-panel p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow">Pending applications</p>
                    <p className="mt-3 text-3xl font-semibold">{overview.applications.pending}</p>
                  </div>
                  <Send className="text-cyan" size={20} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="surface-panel p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Users className="text-cyan" size={18} />
                  <div>
                    <p className="eyebrow">Project health</p>
                    <h2 className="text-xl font-semibold">Current focus</h2>
                  </div>
                </div>
                {projectAnalytics ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-white/10 bg-background/70 p-4">
                      <p className="text-sm text-zinc-400">Project</p>
                      <p className="mt-1 text-lg font-semibold">{projectAnalytics.project.name}</p>
                      <p className="mt-1 text-sm text-zinc-500">Owner: {projectAnalytics.project.owner}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-white/10 bg-background/70 p-4">
                        <p className="text-zinc-400">Total tasks</p>
                        <p className="mt-2 text-xl font-semibold">{projectAnalytics.tasks.total}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-background/70 p-4">
                        <p className="text-zinc-400">Completed</p>
                        <p className="mt-2 text-xl font-semibold">{projectAnalytics.tasks.completed}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-background/70 p-4">
                      <p className="text-zinc-400">Status breakdown</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between"><span>Pending</span><span>{projectAnalytics.tasks.by_status.pending}</span></div>
                        <div className="flex items-center justify-between"><span>In progress</span><span>{projectAnalytics.tasks.by_status.in_progress}</span></div>
                        <div className="flex items-center justify-between"><span>Pending approval</span><span>{projectAnalytics.tasks.by_status.pending_approval}</span></div>
                        <div className="flex items-center justify-between"><span>Done</span><span>{projectAnalytics.tasks.by_status.done}</span></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">No project-level analytics available yet.</p>
                )}
              </div>

              <div className="surface-panel p-6">
                <div className="mb-4 flex items-center gap-3">
                  <BarChart3 className="text-cyan" size={18} />
                  <div>
                    <p className="eyebrow">Weekly momentum</p>
                    <h2 className="text-xl font-semibold">This week</h2>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-background/70 p-4">
                    <p className="text-sm text-zinc-400">Tasks completed this week</p>
                    <p className="mt-2 text-2xl font-semibold">{overview.tasks.completed_this_week}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-background/70 p-4">
                    <p className="text-sm text-zinc-400">Public vs private projects</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span>Public: {overview.projects.public}</span>
                      <span>Private: {overview.projects.private}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-background/70 p-4">
                    <p className="text-sm text-zinc-400">GitHub PR completion</p>
                    <p className="mt-2 text-2xl font-semibold">{projectAnalytics?.github.completed_via_pr ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-panel p-6">
              <div className="mb-4 flex items-center gap-3">
                <Users className="text-cyan" size={18} />
                <div>
                  <p className="eyebrow">Team performance</p>
                  <h2 className="text-xl font-semibold">Member contribution breakdown</h2>
                </div>
              </div>
              {memberAnalytics && memberAnalytics.length > 0 ? (
                <div className="space-y-3">
                  {memberAnalytics.map((member) => (
                    <div key={member.user.id} className="rounded-lg border border-white/10 bg-background/70 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{member.user.full_name || member.user.username}</p>
                          <p className="text-sm text-zinc-500">{member.user.role} • @{member.user.username}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-lg font-semibold">{member.tasks.completion_rate}%</p>
                          <p className="text-sm text-zinc-500">{member.tasks.completed}/{member.tasks.total} completed</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-400">
                        <span>Pending: {member.tasks.pending}</span>
                        <span>In progress: {member.tasks.in_progress}</span>
                        <span>Total assigned: {member.tasks.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">No member analytics available yet for this project.</p>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
