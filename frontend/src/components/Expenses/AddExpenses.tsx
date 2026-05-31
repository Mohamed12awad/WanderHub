import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExpense } from "@/utils/api";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { ErrorResponse } from "@/types/types";
import LoadingSpinner from "../common/spinner";
import { toast } from "@/components/ui/use-toast";
import ExpenseLineTable, { blankLine, ExpenseLine } from "./ExpenseLineTable";

const AddExpenseReport: React.FC = () => {
  const location = useLocation();
  const cloneData = (location.state as any)?.clone;
  const [title, setTitle] = useState(cloneData?.title ?? "");
  const [lines, setLines] = useState<ExpenseLine[]>(cloneData?.expenses?.length ? cloneData.expenses : [blankLine()]);
  const [titleError, setTitleError] = useState("");
  const [linesError, setLinesError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
      await createExpense({ title: title.trim(), userId: "", expenses: lines });
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
              <ExpenseLineTable
                lines={lines}
                onChange={(next) => { setLines(next); setLinesError(""); }}
                error={linesError}
              />
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
