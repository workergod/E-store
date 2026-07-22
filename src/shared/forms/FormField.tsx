import * as React from "react"
import { cn } from "../utils/cn"
import { Label } from "../ui/Label"

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  description?: string
  error?: string
  htmlFor?: string
  required?: boolean
}

export function FormField({ 
  label, 
  description, 
  error, 
  htmlFor, 
  required,
  className, 
  children, 
  ...props 
}: FormFieldProps) {
  return (
    <div className={cn("space-y-[var(--spacing-xs)]", className)} {...props}>
      {label && (
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {description && !error && (
        <p className="text-[13px] text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-[13px] font-medium text-destructive">{error}</p>
      )}
    </div>
  )
}
