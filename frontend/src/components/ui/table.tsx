import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, onClick, onKeyDown, role, tabIndex, ...props }, ref) => {
  const isInteractive = Boolean(onClick)

  const handleClick: React.MouseEventHandler<HTMLTableRowElement> = (event) => {
    const target = event.target
    if (
      target instanceof Element &&
      target !== event.currentTarget &&
      target.closest("button, a, input, select, textarea, [role='button'], [role='link'], [role='menuitem']")
    ) {
      event.stopPropagation()
      return
    }
    onClick?.(event)
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLTableRowElement> = (event) => {
    onKeyDown?.(event)
    if (
      event.defaultPrevented ||
      !isInteractive ||
      event.target !== event.currentTarget ||
      (event.key !== "Enter" && event.key !== " ")
    ) return

    event.preventDefault()
    event.currentTarget.click()
  }

  return (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive || onKeyDown ? handleKeyDown : undefined}
      // Deliberately does NOT override the implicit `row` role. Giving a <tr>
      // role="link"/"button" removes it from the table structure for assistive
      // tech, costing the "row 3 of 10, column Customer" context that matters
      // most in a dense ERP grid — a worse trade than the one it buys. The row
      // is made focusable and Enter/Space-activatable instead. The fully
      // conformant pattern is a real link in each row's primary cell; that is a
      // larger change across ~21 row components and is tracked as follow-up.
      role={role}
      tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
      {...props}
    />
  )
})
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 px-4 text-start align-middle font-semibold uppercase tracking-wider text-[11px] text-foreground/50 [&:has([role=checkbox])]:p-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-2.5 align-middle [&:has([role=checkbox])]:p-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
