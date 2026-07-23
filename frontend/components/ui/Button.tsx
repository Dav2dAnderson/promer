import React from 'react'
import Link from 'next/link'
import { Spinner } from './Spinner'

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'href'> {
  variant?: 'primary' | 'secondary' | 'danger'
  isLoading?: boolean
  href?: string
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  isLoading = false,
  size = 'md',
  children,
  disabled,
  href,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/15',
    secondary: 'bg-surface border border-border hover:border-white/20 text-ink',
    danger: 'bg-danger hover:bg-red-500 text-white',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  const buttonClasses = `${sizes[size]} rounded-md font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variants[variant]} ${className}`

  if (href && !isLoading) {
    return (
      <Link href={href} className={buttonClasses}>
        {children}
      </Link>
    )
  }

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
