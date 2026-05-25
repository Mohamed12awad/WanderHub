import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { createExpense } from "@/utils/api";
import { Link, useNavigate } from "react-router-dom";
import { CircleArrowLeft, Trash2, Plus } from "lucide-react";
import { AxiosError } from "axios";
import { ErrorResponse } from "@/types/types";
import LoadingSpinner from "../common/spinner";
import { toast } from "@/components/ui/use-toast";

const CATEGORIES = [
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "transportation", label: "Transportation" },
  { value: "utilities", label: "Utilities" },
  { value: "meals", label: "Meals" },
  { value: "lodging", label: "Lodging" },
  { value: "travel", label: "Travel" },
  { value: "supplies", label: "Supplies" },
  { value: "others", label: "Others" },
];

type ExpenseLine = {
  description: string;
  amount: number;
  date: string;
  category: string;
  beneficiary: string;
};

const blankLine = (): ExpenseLine => ({
  description: "",
  amount: 0,
  date: new Date().toISOString().split("T")[0],
  category: "",
  beneficiary: "",
});

const AddExpenseReport: React.FC = () => {
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<ExpenseLine[]>([blankLine()]);
  const [titleError, setTitleError] = useState("");
  const [linesError, setLinesError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const update = (idx: number, field: keyof ExpenseLine, value: string | number) => {
    setLines((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, [field]: field === "amount" ? Number(value) : value } : row
      )
    );
    setLinesError("");
  };

  const addRow = () => setLines((prev) => [...prev, blankLine()]);

  const removeRow = (idx: number) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const total = lines.reduce((sum, row) => sum + (row.amount || 0), 0);

  const validate = () => {
    let ok = true;
    if (!title.trim()) { setTitleError("Title is required"); ok = false; }
    if (lines.length === 0) {
      setLinesError("At least one expense line is required");
      ok = false;
    } else if (lines.some((r) => !r.description || !r.amount || !r.date || !r.category || !r.beneficiary)) {
      setLinesError("All expense fields are required");
      ok = false;
    }
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsLoading(true);
      await createExpense({ title: title.trim(), userId: "", expenses: lines, approved: false });
      navigate("/expenses");
    } catch (error) {
      setIsLoading(false);
      const msg = (error as AxiosError<ErrorResponse>).response?.data?.message;
      toast({ title: msg ?? "Failed to create expense report", variant: "destructive" });
    }
  };

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link to="/expenses"><CircleArrowLeft /></Link>
            Add Expense Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 my-4">
            <div className="max-w-sm space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
              />
              {titleError && <p className="text-sm text-destructive">{titleError}</p>}
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold">Expense Lines</h2>
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
                          <Select
                            value={row.category}
                            onValueChange={(v) => update(idx, "category", v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
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
                <p className="text-sm font-semibold text-foreground">
                  Total: {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              {linesError && <p className="text-sm text-destructive">{linesError}</p>}
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving…" : "Add Expense Report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AddExpenseReport;
