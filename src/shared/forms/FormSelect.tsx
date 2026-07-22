import * as React from "react"
import { useFormContext } from "react-hook-form"
import { Label } from "../ui/Label"
import { cn } from "../utils/cn"

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string
  label: string
  options: { value: string | number; label: string }[]
  helperText?: string
  containerClassName?: string
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ name, label, options, helperText, containerClassName, className, ...props }, _ref) => {
    const { register, formState: { errors } } = useFormContext()
    const error = errors[name]?.message as string | undefined

    return (
      <div className={cn("space-y-2", containerClassName)}>
        <Label htmlFor={name} className="text-sm font-medium leading-none">
          {label}
        </Label>
        <select
          id={name}
          {...register(name)}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        >
          <option value="" disabled>Select an option</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
FormSelect.displayName = "FormSelect"
