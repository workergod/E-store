import * as React from "react"
import { cn } from "../utils/cn"
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "../app/AppCard"

interface ContentSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  actions?: React.ReactNode
  noPadding?: boolean
}

export function ContentSection({ 
  title, 
  description, 
  actions, 
  noPadding = false,
  className, 
  children,
  ...props 
}: ContentSectionProps) {
  return (
    <AppCard className={cn("", className)} {...props}>
      {(title || description || actions) && (
        <AppCardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border/50 bg-muted/20">
          <div className="space-y-1">
            {title && <AppCardTitle>{title}</AppCardTitle>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </AppCardHeader>
      )}
      <AppCardContent className={cn("pt-6", noPadding && "p-0 pt-0")}>
        {children}
      </AppCardContent>
    </AppCard>
  )
}
