import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/authContext";
import React from "react";
import { toggleUserState } from "@/utils/api";
import { useQueryClient } from "react-query";

interface UserRowProps {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  date: string;
  handleDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const UserRow: React.FC<UserRowProps> = ({ id, name, email, role, active, date, handleDelete, onEdit }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleToggleState = async () => {
    await toggleUserState(id);
    queryClient.invalidateQueries("users");
  };

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => onEdit(id)}>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="hidden md:table-cell text-foreground/70">{email}</TableCell>
      <TableCell className="hidden md:table-cell text-foreground/70 capitalize">{role}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={active
            ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600"
            : "bg-slate-400 text-white border-slate-400 dark:bg-slate-600 dark:border-slate-600"
          }
        >
          {active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground text-xs tabular-nums">{date}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(id)}>Edit</DropdownMenuItem>
            <DropdownMenuItem disabled={user?.id === id} onClick={handleToggleState}>
              {active ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            {["admin", "super admin"].includes(user!.role) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={user?.id === id}
                  onClick={() => handleDelete(id)}
                >
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default UserRow;
