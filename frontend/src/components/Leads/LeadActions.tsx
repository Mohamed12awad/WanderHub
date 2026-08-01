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
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

interface LeadActionsProps {
  id: string;
  handleDelete: (id: string) => void;
}

export default function LeadActions({ id, handleDelete }: LeadActionsProps) {
  const { user } = useAuth();
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
        <Link to={`/leads/${id}`}><DropdownMenuItem>{tr.common.view}</DropdownMenuItem></Link>
        <Link to={`/leads/${id}/edit`}><DropdownMenuItem>{tr.common.edit}</DropdownMenuItem></Link>
        {user?.permissions?.some((permission) => permission === "*" || permission === "leads:delete") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(id)}>{tr.common.delete}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
