import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "../ui/Dialog"

interface AppDialogProps {
  isOpen?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  trigger?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function AppDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  footer,
  className
}: AppDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          {children}
        </div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
