import * as React from "react"
import { ShieldAlert } from "lucide-react"
import { cn } from "../utils/cn"
import { AppButton } from "../app/AppButton"
import { useNavigate } from "react-router-dom"

export interface PermissionStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  showHomeButton?: boolean
}

export function PermissionState({ 
  title = "Access Denied", 
  description = "You do not have the required permissions to view this page or perform this action.", 
  showHomeButton = true,
  className, 
  ...props 
}: PermissionStateProps) {
  const navigate = useNavigate()

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[400px]", className)} {...props}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-6 ring-8 ring-destructive/5">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">{description}</p>
      {showHomeButton && (
        <AppButton variant="default" className="mt-8" onClick={() => navigate('/')}>
          Return to Dashboard
        </AppButton>
      )}
    </div>
  )
}
