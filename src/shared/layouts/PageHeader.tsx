import * as React from "react"
import { cn } from "../utils/cn"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", className)} {...props}>
      <div>
        {typeof title === 'string' ? (
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        ) : (
          <div>{title}</div>
        )}
        {description && (
          typeof description === 'string' ? (
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {description}
            </p>
          ) : (
            <div className="mt-1">{description}</div>
          )
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
