import * as React from "react"
import { Wrench } from "lucide-react"
import { cn } from "../utils/cn"

export interface MaintenanceStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  estimatedTime?: string
}

export function MaintenanceState({ 
  title = "Under Maintenance", 
  description = "We are currently performing scheduled maintenance on the system. Please check back later.", 
  estimatedTime,
  className, 
  ...props 
}: MaintenanceStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center min-h-[400px] bg-background", className)} {...props}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/10 mb-6 ring-8 ring-warning/5">
        <Wrench className="h-10 w-10 text-warning" />
      </div>
      <h3 className="text-2xl font-bold text-foreground">{title}</h3>
      <p className="text-md text-muted-foreground mt-4 max-w-lg">{description}</p>
      {estimatedTime && (
        <div className="mt-8 px-4 py-2 rounded-full bg-muted text-sm font-medium">
          Estimated completion: {estimatedTime}
        </div>
      )}
    </div>
  )
}
