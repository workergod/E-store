import * as React from "react"
import { cn } from "../utils/cn"

export function SectionTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 
      className={cn("text-lg font-semibold tracking-tight border-b border-border pb-2 mb-4", className)} 
      {...props}
    >
      {children}
    </h3>
  )
}
