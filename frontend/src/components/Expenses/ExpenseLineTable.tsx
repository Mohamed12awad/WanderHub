import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const EXPENSE_CATEGORIES = [
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "transportation", label: "Transportation" },
  { value: "operations", label: "Operations" },
  { value: "utilities", label: "Utilities" },
  { value: "meals", label: "Meals" },
  { value: "lodging", label: "Lodging" },
  { value: "travel", label: "Travel" },
  { value: "supplies", label: "Supplies" },
  { value: "others", label: "Others" },
];

export type ExpenseLine = {
  description: string;
  amount: number;
  date: string;
  category: string;
  beneficiary: string;
};

export const blankLine = (): ExpenseLine => ({
  description: "",
  amount: 0,
  date: new Date().toISOString().split("T")[0],
  category: "",
  beneficiary: "",
});

interface Props {
  lines: ExpenseLine[];
  onChange: (lines: ExpenseLine[]) => void;
  error?: string;
}

const ExpenseLineTable: React.FC<Props> = ({ lines, onChange, error }) => {
  const { formatNumber } = useLanguage();
  const update = (idx: number, field: keyof ExpenseLine, value: string | number) => {
    onChange(
      lines.map((row, i) =>
        i === idx ? { ...row, [field]: field === "amount" ? Number(value) : value } : row
      )
    );
  };

  const addRow = () => onChange([...lines, blankLine()]);

  const removeRow = (idx: number) => {
    if (lines.length === 1) return;
    onChange(lines.filter((_, i) => i !== idx));
  };

  const total = lines.reduce((sum, row) => sum + (row.amount || 0), 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Description</TableHead>
              <TableHead className="w-28">Amount</TableHead>
              <TableHead className="w-36">Date</TableHead>
              <TableHead className="min-w-[160px]">Category</TableHead>
              <TableHead className="min-w-[140px]">Beneficiary</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  No expense lines yet.
                </TableCell>
              </TableRow>
            )}
            {lines.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Input
                    value={row.description}
                    onChange={(e) => update(idx, "description", e.target.value)}
                    placeholder="Description"
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.amount || ""}
                    onChange={(e) => update(idx, "amount", e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={row.date}
                    onChange={(e) => update(idx, "date", e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Select value={row.category} onValueChange={(v) => update(idx, "category", v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={row.beneficiary}
                    onChange={(e) => update(idx, "beneficiary", e.target.value)}
                    placeholder="Beneficiary"
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    aria-label={`Remove expense line ${idx + 1}`}
                    onClick={() => removeRow(idx)}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-3.5 w-3.5 me-1" />
          Add Row
        </Button>
        <p className="text-sm font-semibold">
          Total: {formatNumber(total, { maximumFractionDigits: 2 })}
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default ExpenseLineTable;
