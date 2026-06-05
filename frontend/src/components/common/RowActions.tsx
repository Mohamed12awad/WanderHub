import React from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

interface RowActionsProps {
  /** Link target for the "View" item (omit to hide it). */
  viewHref?: string;
  /** Link target for the "Edit" item (omit to hide it). */
  editHref?: string;
  /** Delete handler; the destructive item only renders when provided AND canDelete. */
  onDelete?: () => void;
  canDelete?: boolean;
  /** Extra DropdownMenuItems rendered between Edit and Delete (e.g. Clone). */
  extra?: React.ReactNode;
}

/**
 * The standard per-row "⋯" actions menu (View / Edit / [extra] / Delete) used by
 * every list table, so row actions look and behave identically across modules.
 * Mirrors the long-standing Customers/Leads/Deals pattern.
 */
export function RowActions({ viewHref, editHref, onDelete, canDelete = true, extra }: RowActionsProps) {
  const { tr } = useLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{tr.common.actions}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {viewHref && (
          <Link to={viewHref}>
            <DropdownMenuItem>{tr.common.view}</DropdownMenuItem>
          </Link>
        )}
        {editHref && (
          <Link to={editHref}>
            <DropdownMenuItem>{tr.common.edit}</DropdownMenuItem>
          </Link>
        )}
        {extra}
        {onDelete && canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              {tr.common.delete}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default RowActions;
