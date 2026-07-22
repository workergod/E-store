/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../utils/cn"

const appBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        success: "border-transparent bg-success text-success-foreground shadow",
        warning: "border-transparent bg-warning text-warning-foreground shadow",
        softSuccess: "border-transparent bg-success/15 text-success",
        softWarning: "border-transparent bg-warning/15 text-warning-foreground",
        softDestructive: "border-transparent bg-destructive/15 text-destructive",
        softPrimary: "border-transparent bg-primary/15 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface AppBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof appBadgeVariants> {}

function AppBadge({ className, variant, ...props }: AppBadgeProps) {
  return (
    <div className={cn(appBadgeVariants({ variant }), className)} {...props} />
  )
}

export { AppBadge, appBadgeVariants }
