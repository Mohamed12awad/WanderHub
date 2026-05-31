import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getExpenseById, updateExpense } from "@/utils/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { ErrorResponse } from "@/types/types";
import LoadingSpinner from "../common/spinner";
import { toast } from "@/components/ui/use-toast";
import ExpenseLineTable, { ExpenseLine } from "./ExpenseLineTable";

function toDateString(v: unknown): string {
  if (!v) return "";
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

const EditExpenseReport: React.FC = () => {
  const { id: expenseId } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<ExpenseLine[]>([]);
  const [titleError, setTitleError] = useState("");
  const [linesError, setLinesError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const originalRef = useRef<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data } = await getExpenseById(expenseId!);
        const loadedTitle = data.title ?? "";
        const loadedLines = (data.expenses ?? []).map((e: ExpenseLine) => ({
          ...e,
          date: toDateString(e.date),
        }));
        setTitle(loadedTitle);
        setLines(loadedLines);
        originalRef.current = JSON.stringify({ title: loadedTitle, lines: loadedLines });
      } catch {
        toast({ title: "Failed to load expense report", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [expenseId]);

  const isDirty = originalRef.current !== null && JSON.stringify({ title, lines }) !== originalRef.current;

  const validate = () => {
    let ok = true;
    if (!title.trim()) { setTitleError("Title is required"); ok = false; }
    if (lines.length === 0) {
      setLinesError("At least one expense line is required");
      ok = false;
    } else if (lines.some((r) => !r.description || !r.amount || !r.date || !r.category || !r.beneficiary)) {
      setLinesError("All expense fields are required");
      ok = false;
    } else {
      setLinesError("");
    }
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsLoading(true);
      await updateExpense(expenseId!, { title: title.trim(), userId: "", expenses: lines });
      navigate("/expenses");
    } catch (error) {
      setIsLoading(false);
      const msg = (error as AxiosError<ErrorResponse>).response?.data?.message;
      toast({ title: msg ?? "Failed to update expense report", variant: "destructive" });
    }
  };

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link to={`/expenses/${expenseId}`}><CircleArrowLeft /></Link>
            Edit Expense Report
            {isDirty && (
              <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
                Unsaved changes
              </Badge>
            )}
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
              <ExpenseLineTable
                lines={lines}
                onChange={(next) => { setLines(next); setLinesError(""); }}
                error={linesError}
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving…" : "Update Expense Report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default EditExpenseReport;
