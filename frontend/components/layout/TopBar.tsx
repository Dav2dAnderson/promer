'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, LogOut, Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api, { setToken } from '@/lib/axios'
import type { Notification } from '@/types'

interface TopBarProps {
  breadcrumb?: string[]
}

export function TopBar({ breadcrumb = [] }: TopBarProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setIsOpen(false)
      return
    }

    const fetchNotifications = async () => {
      try {
        const response = await api.get<Notification[]>('/notifications/')
        setNotifications(response.data)
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    fetchNotifications()

    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:8000/api`
      : 'http://127.0.0.1:8000/api')).replace(/\/$/, '')
    const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL
      ? process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, '')
      : (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000`
        : apiBaseUrl.replace(/\/api\/?$/, '').replace(/^https?:/, (protocol) => (protocol === 'https:' ? 'wss:' : 'ws:')))

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempts = 0
    let shouldCloseSocket = false
    let isMounted = true

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    const getSocketUrl = () => {
      // WebSocket URL no longer carries token in query string; backend reads cookie `my-app-auth`
      return `${wsBaseUrl}/ws/notifications/`
    }

    const cleanupSocket = () => {
      shouldCloseSocket = true
      clearReconnectTimer()
      const socket = socketRef.current
      if (socket) {
        socket.onopen = null
        socket.onmessage = null
        socket.onerror = null
        socket.onclose = null
        socket.close(1000, 'Component unmount')
        socketRef.current = null
      }
    }

    const connect = () => {
      if (!isMounted || shouldCloseSocket) return

      const socketUrl = getSocketUrl()
      if (!socketUrl) return

      const socket = new WebSocket(socketUrl)
      socketRef.current = socket

      socket.onopen = () => {
        reconnectAttempts = 0
        console.info('Notification socket connected', socketUrl)
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          setNotifications((prev) => [payload, ...prev])
        } catch (error) {
          console.error('Failed to parse notification payload:', error, event.data)
        }
      }

      socket.onerror = (event) => {
        if (shouldCloseSocket || !isMounted) return
        console.error('Notification socket error', socketUrl, event)
      }

      socket.onclose = (event) => {
        socketRef.current = null
        clearReconnectTimer()

        const intentionalClose = shouldCloseSocket || event.code === 1000
        if (intentionalClose) {
          return
        }

        // Handle unauthorized/invalid token close code from backend
        if (event.code === 4001) {
          console.error('Notification socket closed: unauthorized or invalid token', event.code, event.reason)
          // Attempt graceful recovery: clear token and redirect to login
          try {
            setToken('')
          } catch (e) {
            // ignore
          }
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return
        }

        if (!isMounted) {
          return
        }

        reconnectAttempts += 1
        if (reconnectAttempts > 5) {
          console.error('Notification socket failed after max reconnect attempts', socketUrl, event.code, event.reason)
          return
        }

        const delay = Math.min(5000, 1000 * reconnectAttempts)
        console.warn('Notification socket closed unexpectedly, reconnecting in', delay, 'ms', event.code, event.reason)
        reconnectTimer = setTimeout(() => {
          if (isMounted && !shouldCloseSocket) {
            connect()
          }
        }, delay)
      }
    }

    connect()

    return () => {
      isMounted = false
      cleanupSocket()
    }
  }, [user])

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read/`)
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all/')
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  return (
    <header className="h-16 border-b border-border bg-nav/90 backdrop-blur flex items-center justify-between px-4 sm:px-6 lg:px-8">
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

      {user && (
        <div className="flex items-center gap-3 relative">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="rounded-md p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200 transition-colors"
              title="Notifications"
            >
              <Bell size={17} />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-cyan px-1 text-[10px] font-semibold text-slate-950">
                {unreadCount}
              </span>
            )}

            {isOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Notifications</p>
                  {notifications.some((item) => !item.is_read) && (
                    <button onClick={markAllRead} className="text-xs text-cyan hover:text-cyan/80">
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 space-y-2 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-zinc-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!item.is_read) {
                            markAsRead(item.id)
                          }
                          if (item.link) {
                            router.push(item.link)
                          }
                          setIsOpen(false)
                        }}
                        className={`w-full rounded-lg border p-3 text-left transition ${item.is_read ? 'border-white/10 bg-white/[0.03]' : 'border-cyan/30 bg-cyan/10'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            <p className="mt-1 text-sm text-zinc-400">{item.message}</p>
                          </div>
                          {item.link && <ExternalLink size={14} className="mt-1 text-zinc-500" />}
                        </div>
                        {!item.is_read && <div className="mt-2 flex items-center gap-1 text-xs text-cyan"><CheckCheck size={12} /> New</div>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
