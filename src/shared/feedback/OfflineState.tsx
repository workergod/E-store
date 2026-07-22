import * as React from "react"
import { WifiOff, RefreshCw } from "lucide-react"
import { cn } from "../utils/cn"
import { AppButton } from "../app/AppButton"

export interface OfflineStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  onRetry?: () => void
}

export function OfflineState({ 
  title = "You are offline", 
  description = "Please check your internet connection and try again.", 
  onRetry,
  className, 
  ...props 
}: OfflineStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[300px]", className)} {...props}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">{description}</p>
      {onRetry && (
        <AppButton variant="outline" className="mt-8" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Connection
        </AppButton>
      )}
    </div>
  )
}
