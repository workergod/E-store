import * as React from "react"
import { cn } from "../utils/cn"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--spacing-3xl)] shadow-premium">
      <div className="flex flex-col space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-12 w-[300px] rounded-[var(--radius-input)]" />
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-[100px] rounded-[var(--radius-btn)]" />
          <Skeleton className="h-10 w-[100px] rounded-[var(--radius-btn)]" />
        </div>
      </div>
      <div className="rounded-[var(--radius)] border border-border bg-card overflow-hidden">
        <div className="flex border-b border-border bg-muted/30 p-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4 mx-4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4 ml-4" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex border-b border-border p-4 items-center">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <Skeleton className="h-4 w-1/4 ml-4" />
            <Skeleton className="h-4 w-1/4 mx-4" />
            <Skeleton className="h-4 w-1/4" />
            <div className="ml-auto flex space-x-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { Skeleton }
