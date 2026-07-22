import * as React from "react"
import { cn } from "../utils/cn"
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "../app/AppCard"

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function MetricCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend,
  className, 
  ...props 
}: MetricCardProps) {
  return (
    <AppCard className={cn("overflow-hidden", className)} {...props}>
      <AppCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <AppCardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </AppCardTitle>
        {icon && (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
      </AppCardHeader>
      <AppCardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            {trend && (
              <span className={cn(
                "inline-flex items-center font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
            {description}
          </p>
        )}
      </AppCardContent>
    </AppCard>
  )
}
