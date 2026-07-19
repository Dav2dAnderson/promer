'use client'

import React from 'react'
import { ChevronRight, LogOut, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface TopBarProps {
  breadcrumb?: string[]
}

export function TopBar({ breadcrumb = [] }: TopBarProps) {
  const { user, logout } = useAuth()

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumb.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight size={16} className="text-gray-500" />}
            <span className={index === breadcrumb.length - 1 ? 'text-white' : 'text-gray-400'}>
              {item}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* User menu */}
      {user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-medium">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{user.username}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </header>
  )
}