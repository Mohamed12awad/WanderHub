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
import { Link } from "react-router-dom";

interface DealActionsProps {
  id: string;
  handleDelete: (id: string) => void;
}

export default function DealActions({ id, handleDelete }: DealActionsProps) {
  const { user } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Link to={`/deals/${id}`}><DropdownMenuItem>View</DropdownMenuItem></Link>
        <Link to={`/deals/${id}/edit`}><DropdownMenuItem>Edit</DropdownMenuItem></Link>
        {user?.permissions?.some((permission) => permission === "*" || permission === "deals:delete") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(id)}>Delete</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
