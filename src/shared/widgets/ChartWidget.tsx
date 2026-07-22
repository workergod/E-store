import * as React from "react"
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "../app/AppCard"
import { ResponsiveContainer } from "recharts"
import { cn } from "../utils/cn"

interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: React.ReactNode
  height?: number
  children: React.ReactElement
}

export function ChartCard({ title, subtitle, action, height = 300, children, className, ...props }: ChartCardProps) {
  return (
    <AppCard className={cn("", className)} {...props}>
      <AppCardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <AppCardTitle>{title}</AppCardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </AppCardHeader>
      <AppCardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </AppCardContent>
    </AppCard>
  )
}
