import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/authContext";
import { Link } from "react-router-dom";

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

  return (
    <TableRow>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline">{type}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">{capacity}</TableCell>
      <TableCell className="hidden md:table-cell capitalize">{location}</TableCell>
      <TableCell className="hidden md:table-cell">{date}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <Link to={`/products/${id}`}>
              <DropdownMenuItem>View</DropdownMenuItem>
            </Link>
            <Link to={`/products/${id}/edit`}>
              <DropdownMenuItem>Edit</DropdownMenuItem>
            </Link>
            {["admin", "super admin"].includes(user!.role) && (
              <DropdownMenuItem onClick={() => handleDelete(id)}>
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default ProductRow;
