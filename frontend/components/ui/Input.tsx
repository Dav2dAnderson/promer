import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-300">{label}</label>
      )}
      <input
        className={`w-full px-3 py-2.5 bg-background border border-border rounded-md text-ink placeholder-muted focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-accent/20 transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
