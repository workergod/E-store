import * as React from "react"
import { useFormContext } from "react-hook-form"
import { AppInput } from "./AppInput"
import { Label } from "../ui/Label"
import { cn } from "../utils/cn"

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  helperText?: string
  containerClassName?: string
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ name, label, helperText, containerClassName, className, ...props }, _ref) => {
    const { register, formState: { errors } } = useFormContext()
    const error = errors[name]?.message as string | undefined

    return (
      <div className={cn("space-y-2", containerClassName)}>
        <Label htmlFor={name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
        <AppInput
          id={name}
          {...register(name)}
          error={!!error}
          className={className}
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
FormInput.displayName = "FormInput"
