import { useNavigate } from "react-router-dom";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/common/RowActions";
import { Supplier } from "@/types/types";
import { format } from "date-fns";

interface Props {
  supplier: Supplier;
  handleDelete: (id: string) => void;
}

export default function SupplierRow({ supplier, handleDelete }: Props) {
  const navigate = useNavigate();

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/procurement/suppliers/${supplier._id}`)}>
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
      <TableCell onClick={(e) => e.stopPropagation()}>
        <RowActions
          viewHref={`/procurement/suppliers/${supplier._id}`}
          editHref={`/procurement/suppliers/${supplier._id}/edit`}
          onDelete={() => handleDelete(supplier._id)}
        />
      </TableCell>
    </TableRow>
  );
}
