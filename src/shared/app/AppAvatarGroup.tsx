import * as React from "react"
import { cn } from "../utils/cn"

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
  users: { name: string, initials?: string, imageUrl?: string }[]
}

export function AvatarGroup({ max = 4, users, className, ...props }: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max)
  const remaining = users.length - max

  return (
    <div className={cn("flex items-center -space-x-2", className)} {...props}>
      {visibleUsers.map((user, i) => (
        <div 
          key={i} 
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground ring-2 ring-transparent transition-all hover:z-10 hover:ring-primary/20"
          title={user.name}
        >
          {user.imageUrl ? (
            <img src={user.imageUrl} alt={user.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span>{user.initials || user.name.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-medium text-secondary-foreground">
          +{remaining}
        </div>
      )}
    </div>
  )
}
