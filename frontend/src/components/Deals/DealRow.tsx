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

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700",
  qualified: "bg-purple-100 text-purple-700",
  proposal: "bg-yellow-100 text-yellow-700",
  negotiation: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

interface DealRowProps {
  id: string;
  title: string;
  customer: string;
  status: string;
  value: string;
  date: string;
  handleDelete: (id: string) => void;
}

const DealRow: React.FC<DealRowProps> = ({ id, title, customer, status, value, date, handleDelete }) => {
  const { user } = useAuth();

  return (
    <TableRow>
      <TableCell className="font-medium">{title}</TableCell>
      <TableCell>{customer}</TableCell>
      <TableCell>
        <Badge className={STATUS_COLORS[status] ?? ""} variant="outline">
          {status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">{value}</TableCell>
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
            <Link to={`/deals/${id}`}>
              <DropdownMenuItem>View</DropdownMenuItem>
            </Link>
            <Link to={`/deals/${id}/edit`}>
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

export default DealRow;
