import React from 'react'
import type { Comment } from '@/types'

interface CommentThreadProps {
  comments: Comment[]
}

export function CommentThread({ comments }: CommentThreadProps) {
  if (comments.length === 0) {
    return <p className="text-gray-400 text-sm">No comments yet.</p>
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-medium">
              {comment.user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{comment.user.username}</p>
              <p className="text-xs text-gray-400">
                {new Date(comment.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-gray-300">{comment.content}</p>
          {comment.github_url && (
            <a
              href={comment.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-accent hover:underline"
            >
              View on GitHub
            </a>
          )}
        </div>
      ))}
    </div>
  )
}