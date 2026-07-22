import * as React from "react"
import { Search } from "lucide-react"
import { cn } from "../utils/cn"

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", containerClassName)}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          ref={ref}
          type="search"
          className={cn(
            "w-full h-[52px] pl-[44px] pr-5 rounded-[var(--radius-input)] bg-card border border-border shadow-sm text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
SearchBar.displayName = "SearchBar"
