import * as React from "react"
import { AppCard, AppCardHeader, AppCardContent } from "../app/AppCard"
import { cn } from "../utils/cn"

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
}

export function FormSection({ title, description, children, className, ...props }: FormSectionProps) {
  return (
    <AppCard className={cn("shadow-sm", className)} {...props}>
      <AppCardHeader>
        <h3 className="text-card-title">{title}</h3>
        {description && <p className="text-caption text-muted-foreground mt-1">{description}</p>}
      </AppCardHeader>
      <AppCardContent className="mt-4">
        <div className="space-y-[var(--spacing-xl)]">
          {children}
        </div>
      </AppCardContent>
    </AppCard>
  )
}
