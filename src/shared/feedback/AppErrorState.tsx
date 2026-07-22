import * as React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "../utils/cn"
import { AppButton } from "../app/AppButton"

export interface AppErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  onRetry?: () => void
}

export function AppErrorState({ 
  title = "Something went wrong", 
  description = "An error occurred while loading this data.", 
  onRetry,
  className, 
  ...props 
}: AppErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)} {...props}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {onRetry && (
        <AppButton variant="outline" className="mt-6" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </AppButton>
      )}
    </div>
  )
}
