import { useNavigate } from "react-router-dom";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/common/RowActions";
import { Supplier } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  supplier: Supplier;
  handleDelete: (id: string) => void;
}

export default function SupplierRow({ supplier, handleDelete }: Props) {
  const navigate = useNavigate();
  const { tr, formatDate } = useLanguage();

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/procurement/suppliers/${supplier._id}`)}>
      <TableCell dir="auto" className="font-medium">{supplier.name}</TableCell>
      <TableCell dir="auto">{supplier.contactName || "-"}</TableCell>
      <TableCell dir="auto">{supplier.email || "-"}</TableCell>
      <TableCell>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            supplier.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {supplier.status === "active" ? tr.suppliers.active : tr.suppliers.inactive}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {formatDate(supplier.createdAt)}
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
