import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExpense, getProjects } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { ErrorResponse } from "@/types/types";
import LoadingSpinner from "../common/spinner";
import { toast } from "@/components/ui/use-toast";
import ExpenseLineTable, { blankLine, ExpenseLine } from "./ExpenseLineTable";
import DynamicFields from "@/components/common/DynamicFields";
import { toCustomFieldValues } from "@/utils/customFields";

const AddExpenseReport: React.FC = () => {
  const location = useLocation();
  const cloneData = (location.state as any)?.clone;
  const [title, setTitle] = useState(cloneData?.title ?? "");
  const [projectId, setProjectId] = useState(cloneData?.project ?? "");
  const [lines, setLines] = useState<ExpenseLine[]>(cloneData?.expenses?.length ? cloneData.expenses : [blankLine()]);
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    cloneData?.customFields ? toCustomFieldValues(cloneData.customFields) : {},
  );
  const [titleError, setTitleError] = useState("");
  const [linesError, setLinesError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { data: projectsData } = useQuery({ queryKey: ["projects-all"], queryFn: () => getProjects({ limit: 1000 }) });
  const projects: { _id: string; name: string }[] = Array.isArray(projectsData?.data) ? projectsData.data : projectsData?.data?.data ?? [];

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
      const cleanLines = lines.map(({ _id, expenseReportId, ...line }: any) => line);
      await createExpense({ title: title.trim(), expenses: cleanLines, customFields, ...(projectId ? { project: projectId } : {}) } as any);
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

            <div className="max-w-sm space-y-1">
              <Label htmlFor="project">Project (optional)</Label>
              <select
                id="project"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold">Expense Lines</h2>
              <ExpenseLineTable
                lines={lines}
                onChange={(next) => { setLines(next); setLinesError(""); }}
                error={linesError}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DynamicFields module="expenses" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />
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
