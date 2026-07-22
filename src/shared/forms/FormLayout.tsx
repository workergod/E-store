import * as React from "react"
import { cn } from "../utils/cn"

export function AppForm({ className, children, ...props }: React.HTMLAttributes<HTMLFormElement>) {
  return (
    <form className={cn("space-y-[var(--spacing-3xl)] max-w-4xl mx-auto w-full", className)} {...props}>
      {children}
    </form>
  )
}

export function FormActions({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-end gap-3 pt-6 border-t border-border mt-8", className)} {...props}>
      {children}
    </div>
  )
}

export function FormRow({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-xl)]", className)} {...props}>
      {children}
    </div>
  )
}
