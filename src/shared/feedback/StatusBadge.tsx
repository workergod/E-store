import { AppBadge } from "../app/AppBadge"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let variant: 'default' | 'softSuccess' | 'softWarning' | 'softDestructive' | 'softPrimary' | 'secondary' = 'secondary'
  
  const s = status.toUpperCase()
  
  if (s === 'ACTIVE' || s === 'COMPLETED' || s === 'DELIVERED') {
    variant = 'softSuccess'
  } else if (s === 'PARTIALLY RECEIVED') {
    variant = 'softWarning'
  } else if (s === 'DRAFT') {
    variant = 'softSuccess'
  } else if (s === 'PENDING' || s === 'DRAFT' || s === 'ON_LEAVE' || s === 'PROCESSING') {
    variant = 'softWarning'
  } else if (s === 'ARCHIVED' || s === 'CANCELLED' || s === 'TERMINATED' || s === 'SUSPENDED') {
    variant = 'softDestructive'
  } else if (s === 'IN_TRANSIT' || s === 'APPROVED') {
    variant = 'softPrimary'
  }

  return (
    <AppBadge variant={variant} className="uppercase tracking-wider text-[10px]">
      {status.replace('_', ' ')}
    </AppBadge>
  )
}
