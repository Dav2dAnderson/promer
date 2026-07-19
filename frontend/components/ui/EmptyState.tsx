import React from 'react'

export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-gray-500 mb-4">{icon}</div>}
      <p className="text-gray-400">{message}</p>
    </div>
  )
}