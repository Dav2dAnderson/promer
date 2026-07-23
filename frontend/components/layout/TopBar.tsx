'use client'

import React from 'react'
import { ChevronRight, LogOut, Bell } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface TopBarProps {
  breadcrumb?: string[]
}

export function TopBar({ breadcrumb = [] }: TopBarProps) {
  const { user, logout } = useAuth()

  return (
    <header className="h-16 border-b border-border bg-nav/90 backdrop-blur flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumb.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight size={14} className="text-zinc-600" />}
            <span className={index === breadcrumb.length - 1 ? 'text-zinc-100' : 'text-zinc-500'}>
              {item}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* User menu */}
      {user && (
        <div className="flex items-center gap-3">
          <button className="rounded-md p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200 transition-colors" title="Notifications"><Bell size={17} /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-sm font-medium text-cyan">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{user.username}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </header>
  )
}
