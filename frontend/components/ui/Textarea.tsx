import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-300">{label}</label>
      )}
      <textarea
        className={`w-full px-3 py-2.5 bg-background border border-border rounded-md text-ink placeholder-muted focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-accent/20 transition-colors resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
