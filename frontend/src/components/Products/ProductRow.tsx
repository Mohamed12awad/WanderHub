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
import { Link, useNavigate } from "react-router-dom";

interface ProductRowProps {
  id: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  date: string;
  handleDelete: (id: string) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({
  id, name, type, capacity, location, date, handleDelete,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/products/${id}`)}>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline">{type}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell font-medium tabular-nums">{capacity}</TableCell>
      <TableCell className="hidden md:table-cell text-foreground/70 capitalize">{location}</TableCell>
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
            <Link to={`/products/${id}`}>
              <DropdownMenuItem>View</DropdownMenuItem>
            </Link>
            <Link to={`/products/${id}/edit`}>
              <DropdownMenuItem>Edit</DropdownMenuItem>
            </Link>
            {["admin", "super admin"].includes(user!.role) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(id)}>
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

export default ProductRow;
