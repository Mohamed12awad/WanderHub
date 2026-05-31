import { useNavigate } from "react-router-dom";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Supplier } from "@/types/types";
import { format } from "date-fns";

interface Props {
  supplier: Supplier;
  handleDelete: (id: string) => void;
}

export default function SupplierRow({ supplier, handleDelete }: Props) {
  const navigate = useNavigate();

  return (
    <TableRow className="group">
      <TableCell className="font-medium">{supplier.name}</TableCell>
      <TableCell>{supplier.contactName || "-"}</TableCell>
      <TableCell>{supplier.email || "-"}</TableCell>
      <TableCell>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            supplier.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {supplier.status === "active" ? "Active" : "Inactive"}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {format(new Date(supplier.createdAt), "MMM d, yyyy")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/procurement/suppliers/${supplier._id}`)}
          >
            <Eye className="w-4 h-4 text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/procurement/suppliers/${supplier._id}/edit`)}
          >
            <Edit className="w-4 h-4 text-amber-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(supplier._id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
