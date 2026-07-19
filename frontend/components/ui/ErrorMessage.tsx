import React from 'react'

export function ErrorMessage({ error }: { error: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-md text-sm">
      {error}
    </div>
  )
}