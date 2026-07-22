import * as React from "react"
import { cn } from "../utils/cn"

export function PageContainer({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("page-container py-[var(--spacing-3xl)] space-y-[var(--spacing-3xl)]", className)} {...props}>
      {children}
    </div>
  )
}
