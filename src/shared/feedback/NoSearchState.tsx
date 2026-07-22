import * as React from "react"
import { SearchX } from "lucide-react"
import { cn } from "../utils/cn"
import { AppButton } from "../app/AppButton"

export interface NoSearchStateProps extends React.HTMLAttributes<HTMLDivElement> {
  searchQuery: string
  onClear?: () => void
}

export function NoSearchState({ 
  searchQuery, 
  onClear,
  className, 
  ...props 
}: NoSearchStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)} {...props}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-6">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">No results found</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        We couldn't find anything matching <span className="font-semibold text-foreground">"{searchQuery}"</span>. Try adjusting your search or filters.
      </p>
      {onClear && (
        <AppButton variant="outline" className="mt-6" onClick={onClear}>
          Clear Search
        </AppButton>
      )}
    </div>
  )
}
