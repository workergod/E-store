import * as React from "react"
import { cn } from "../utils/cn"

export function FilterBar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 bg-background border-b border-border mb-6", className)}
      {...props}
    >
      {children}
    </div>
  )
}
