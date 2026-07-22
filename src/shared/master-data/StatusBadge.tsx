import { cn } from "../utils/cn";

export function StatusBadge({ status }: { status: 'ACTIVE' | 'ARCHIVED' }) {
  return (
    <span 
      className={cn(
        "px-2 py-1 rounded-full text-xs font-semibold tracking-wide",
        status === 'ACTIVE' 
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
      )}
    >
      {status}
    </span>
  );
}
