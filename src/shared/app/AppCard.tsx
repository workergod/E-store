import * as React from "react"
import { cn } from "../utils/cn"

const AppCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[var(--radius)] border border-border bg-card text-foreground shadow-premium transition-transform duration-hover hover:-translate-y-0.5",
      className
    )}
    {...props}
  />
))
AppCard.displayName = "AppCard"

const AppCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-[var(--spacing-3xl)] pb-0", className)}
    {...props}
  />
))
AppCardHeader.displayName = "AppCardHeader"

const AppCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
AppCardTitle.displayName = "AppCardTitle"

const AppCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AppCardDescription.displayName = "AppCardDescription"

const AppCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-[var(--spacing-3xl)] pt-[var(--spacing-2xl)]", className)} {...props} />
))
AppCardContent.displayName = "AppCardContent"

const AppCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-[var(--spacing-3xl)] pt-0", className)}
    {...props}
  />
))
AppCardFooter.displayName = "AppCardFooter"

export { AppCard, AppCardHeader, AppCardFooter, AppCardTitle, AppCardDescription, AppCardContent }
