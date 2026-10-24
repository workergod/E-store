import * as React from "react"
import {
  flexRender,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getCoreRowModel,
} from "@tanstack/react-table"
import type { SortingState, ColumnDef } from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/Table"
import { Button } from "../ui/Button"
import { AppCard } from "../app/AppCard"
import { SearchBar } from "../forms/SearchBar"
import { EmptyState } from "../feedback/EmptyState"
import { AppErrorState } from "../feedback/AppErrorState"
import { TableSkeleton } from "../skeletons/AppSkeleton"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "../utils/cn"

interface AppTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  hidePagination?: boolean
}

export function AppTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  isLoading,
  isError,
  onRetry,
  emptyTitle = "No data found",
  emptyDescription,
  hidePagination = false,
}: AppTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  if (isLoading) {
    return <TableSkeleton />
  }

  if (isError) {
    return (
      <AppCard className="overflow-hidden border-border/50">
        <AppErrorState onRetry={onRetry} />
      </AppCard>
    )
  }

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="flex items-center justify-between">
          <SearchBar
            placeholder={searchPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      <AppCard className="overflow-hidden border-border/50">
        <Table>
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-border/50">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { align?: 'left' | 'center' | 'right'; className?: string } | undefined;
                  const isActionCol = header.id === 'actions' || (header.id === 'id' && typeof header.column.columnDef.header === 'string' && header.column.columnDef.header.toLowerCase().includes('action'));
                  const align = meta?.align || (isActionCol ? 'right' : 'left');

                  return (
                    <TableHead 
                      key={header.id} 
                      className={cn(
                        "h-11 font-semibold text-muted-foreground",
                        align === 'right' && "text-right",
                        align === 'center' && "text-center",
                        header.column.getCanSort() && "cursor-pointer select-none hover:text-foreground hover:bg-muted/40 transition-colors",
                        meta?.className
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      title={header.column.getCanSort() ? "Click to toggle Ascending / Descending" : undefined}
                    >
                      <div className={cn(
                        "flex items-center gap-1.5",
                        align === 'right' && "justify-end",
                        align === 'center' && "justify-center"
                      )}>
                        <span>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </span>
                        {header.column.getCanSort() && (
                          <span className="shrink-0 text-muted-foreground inline-flex">
                            {{
                              asc: <ArrowUp className="h-3.5 w-3.5 text-primary" />,
                              desc: <ArrowDown className="h-3.5 w-3.5 text-primary" />,
                            }[header.column.getIsSorted() as string] ?? (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-30 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/20 border-b-border/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { align?: 'left' | 'center' | 'right'; className?: string } | undefined;
                    const isActionCol = cell.column.id === 'actions' || (cell.column.id === 'id' && typeof cell.column.columnDef.header === 'string' && cell.column.columnDef.header.toLowerCase().includes('action'));
                    const align = meta?.align || (isActionCol ? 'right' : 'left');

                    return (
                      <TableCell key={cell.id} className={cn("py-3", align === 'right' && "text-right", align === 'center' && "text-center", meta?.className)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <EmptyState title={emptyTitle} description={emptyDescription} className="border-none shadow-none bg-transparent" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AppCard>

      {/* Pagination Controls */}
      {!hidePagination && (table.getPageCount() > 1 || data.length > 10) && (
        <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
          <div>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
