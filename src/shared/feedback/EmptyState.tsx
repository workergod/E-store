import * as React from "react"
import { cn } from "../utils/cn"
import { AppCard } from "../app/AppCard"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  fullPage?: boolean
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  fullPage = false,
  className,
  ...props 
}: EmptyStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 sm:p-12", className)} {...props}>
      {icon && (
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        {content}
      </div>
    )
  }

  return <AppCard className="border-dashed bg-muted/10">{content}</AppCard>
}
