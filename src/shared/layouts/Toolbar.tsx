import * as React from "react"
import { cn } from "../utils/cn"

export function Toolbar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("flex flex-wrap items-center gap-2 p-1 bg-muted/50 rounded-lg border border-border/50", className)} 
      {...props}
    >
      {children}
    </div>
  )
}
