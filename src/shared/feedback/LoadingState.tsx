import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "../utils/cn"

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
  fullPage?: boolean
}

export function LoadingState({ message = "Loading...", fullPage = false, className, ...props }: LoadingStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center p-8", className)} {...props}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center bg-background/50 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return content
}
