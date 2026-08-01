import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/authContext";
import { toggleUserState } from "@/utils/api";
import { useQueryClient } from "@tanstack/react-query";

interface UserActionsProps {
  id: string;
  active: boolean;
  handleDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function UserActions({ id, active, handleDelete, onEdit }: UserActionsProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleToggleState = async () => {
    await toggleUserState(id);
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(id)}>Edit</DropdownMenuItem>
        <DropdownMenuItem disabled={user?._id === id} onClick={handleToggleState}>
          {active ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
        {user?.permissions?.some((permission) => permission === "*" || permission === "users:delete") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={user?._id === id}
              onClick={() => handleDelete(id)}
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
