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
  title = "You're offline", 
  description = "No internet connection detected. Cryodeal will automatically reconnect once your network is restored.", 
  onRetry,
  className, 
  ...props 
}: OfflineStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[360px]", className)} {...props}>
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-card border-2 border-primary/40 shadow-premium flex items-center justify-center">
          <svg viewBox="0 0 512 512" fill="none" className="w-12 h-12">
            <path d="M 356 172 A 136 136 0 1 0 356 340" stroke="currentColor" strokeWidth="56" strokeLinecap="round" className="text-primary" />
            <circle cx="360" cy="256" r="20" className="fill-destructive" />
          </svg>
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-sm">
          <WifiOff className="h-4 w-4" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">{description}</p>
      {onRetry && (
        <AppButton variant="outline" className="mt-6" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Connection
        </AppButton>
      )}
    </div>
  )
}
