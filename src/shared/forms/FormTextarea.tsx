import * as React from "react"
import { useFormContext } from "react-hook-form"
import { Label } from "../ui/Label"
import { cn } from "../utils/cn"

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string
  label: string
  helperText?: string
  containerClassName?: string
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ name, label, helperText, containerClassName, className, ...props }, _ref) => {
    const { register, formState: { errors } } = useFormContext()
    const error = errors[name]?.message as string | undefined

    return (
      <div className={cn("space-y-2", containerClassName)}>
        <Label htmlFor={name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
        <textarea
          id={name}
          {...register(name)}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[13px] font-medium text-destructive">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-[13px] text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)
FormTextarea.displayName = "FormTextarea"
