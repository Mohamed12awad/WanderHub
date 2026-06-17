import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { FormActions, TextField } from "@/components/common/form";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import DynamicFields from "@/components/common/DynamicFields";
import ExpenseLineTable, { blankLine, ExpenseLine } from "./ExpenseLineTable";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { queryKeys } from "@/lib/queryKeys";
import { createExpense, getCostCenters, getExpenseById, getProjects, updateExpense } from "@/utils/api";
import { toCustomFieldValues } from "@/utils/customFields";

const schema = z.object({
  title:   z.string().min(1, "Title is required"),
  project: z.string().optional(),
  costCenterId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExpenseFormProps {
  mode: "create" | "edit";
  id?: string;
  defaultValues?: Partial<FormValues> & {
    expenses?: ExpenseLine[];
    customFields?: Record<string, string>;
  };
}

function toDateString(v: unknown): string {
  if (!v) return "";
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

function normalizeLines(lines: ExpenseLine[]) {
  return lines.map((line: any) => ({
    description: line.description ?? "",
    amount: Number(line.amount ?? 0),
    date: toDateString(line.date) || String(line.date ?? ""),
    category: line.category ?? "",
    beneficiary: line.beneficiary ?? "",
  }));
}

function buildSnapshot(values: FormValues, lines: ExpenseLine[], customFields: Record<string, string>) {
  return JSON.stringify({
    title: values.title ?? "",
    project: values.project ?? "",
    costCenterId: values.costCenterId ?? "",
    lines: normalizeLines(lines),
    customFields,
  });
}

export function ExpenseForm({ mode, id, defaultValues }: ExpenseFormProps) {
  const navigate = useNavigate();
  const backTo = mode === "create" ? "/expenses" : `/expenses/${id}`;

  const [lines, setLines]             = useState<ExpenseLine[]>(defaultValues?.expenses ?? [blankLine()]);
  const [linesError, setLinesError]   = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>(defaultValues?.customFields ?? {});
  const [projectLabel, setProjectLabel] = useState((defaultValues as any)?.projectLabel ?? "");
  const [costCenterLabel, setCostCenterLabel] = useState((defaultValues as any)?.costCenterLabel ?? "");
  const [isDirty, setIsDirty]         = useState(false);
  const originalRef                   = useRef<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", project: "", costCenterId: "", ...defaultValues },
  });
  const values = form.watch();

  const fetchProjects = useCallback(
    (q: string) => getProjects({ page: 1, limit: 20, q }).then((r) =>
      ((Array.isArray(r?.data) ? r.data : (r as any)?.data?.data ?? []) as any[]).map((p) => ({ value: p._id, label: p.name }))
    ), [],
  );
  const fetchCostCenters = useCallback(
    (q: string) => getCostCenters({ q, isActive: true }).then((r) =>
      [
        { value: "", label: "None" },
        ...(r.data ?? []).map((cc) => ({ value: cc._id, label: `${cc.code} — ${cc.name}` })),
      ]
    ), [],
  );

  // Load existing expense for edit mode
  useEffect(() => {
    if (mode !== "edit" || !id) return;
    getExpenseById(id).then(({ data }) => {
      const loadedValues = {
        title: data.title ?? "",
        project: data.project?._id ?? data.projectId ?? data.project ?? "",
        costCenterId: data.costCenter?._id ?? data.costCenterId ?? "",
      };
      setProjectLabel(data.project?.name ?? "");
      setCostCenterLabel(data.costCenter ? `${data.costCenter.code} — ${data.costCenter.name}` : "None");
      const loadedLines = normalizeLines(data.expenses ?? []);
      const loadedCustomFields = toCustomFieldValues(data.customFields);
      form.reset(loadedValues);
      setLines(loadedLines);
      setCustomFields(loadedCustomFields);
      originalRef.current = buildSnapshot(loadedValues, loadedLines, loadedCustomFields);
      setIsDirty(false);
    });
  }, [id, mode, form]);

  useEffect(() => {
    if (mode === "create" && originalRef.current === null) {
      originalRef.current = buildSnapshot(values, lines, customFields);
    }
    if (originalRef.current === null) return;
    setIsDirty(buildSnapshot(values, lines, customFields) !== originalRef.current);
  }, [customFields, lines, mode, values]);
  const { allowNavigation } = useUnsavedChangesGuard(isDirty);

  const validateLines = (): boolean => {
    if (lines.length === 0) { setLinesError("At least one expense line is required"); return false; }
    // Check each field per row and report the exact one missing, so a blank
    // field (e.g. an unselected category) is obvious instead of a generic error.
    const fields: [keyof ExpenseLine, string][] = [
      ["description", "Description"], ["amount", "Amount"], ["date", "Date"],
      ["category", "Category"], ["beneficiary", "Beneficiary"],
    ];
    for (let i = 0; i < lines.length; i++) {
      for (const [key, label] of fields) {
        const value = lines[i][key];
        const missing = key === "amount"
          ? !(Number(value) > 0)
          : String(value ?? "").trim() === "";
        if (missing) { setLinesError(`Row ${i + 1}: ${label} is required`); return false; }
      }
    }
    setLinesError(""); return true;
  };

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => mode === "create" ? createExpense(payload as any) : updateExpense(id!, payload as any),
    invalidate: [queryKeys.expenses.all],
    successMessage: mode === "create" ? "Expense report created" : "Expense report updated",
    errorMessage:   mode === "create" ? "Failed to create expense report" : "Failed to update expense report",
    onSuccess: () => {
      allowNavigation();
      setIsDirty(false);
      navigate(mode === "create" ? "/expenses" : `/expenses/${id}`);
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!validateLines()) return;
    const cleanLines = lines.map(({ _id, expenseReportId: _expenseReportId, ...line }: any) => line);
    mutation.mutate({
      title: values.title.trim(),
      expenses: cleanLines,
      customFields,
      ...(values.project ? { project: values.project } : {}),
      costCenterId: values.costCenterId || null,
    });
  };

  const formTitle = mode === "create" ? "Add Expense Report" : (
    <span className="flex items-center gap-2">
      Edit Expense Report
      {isDirty && (
        <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
          Unsaved changes
        </Badge>
      )}
    </span>
  );

  return (
    <EntityFormPage title={formTitle} backHref={backTo} breadcrumb={[{ label: "Expenses", href: "/expenses" }, { label: mode === "edit" ? "Edit" : "New" }]}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 my-2">
          <div className="max-w-sm">
            <TextField<FormValues> name="title" label="Title" required placeholder="e.g. Q2 Travel Expenses" />
          </div>

          <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="project" className="text-sm font-medium">Project (optional)</label>
              <AsyncSearchableSelect
                value={form.watch("project") ?? ""}
                onChange={(v) => form.setValue("project", v)}
                fetchFn={fetchProjects}
                selectedLabel={projectLabel}
                placeholder="Link to a project"
                searchPlaceholder="Search projects…"
                onSelectItem={(item) => setProjectLabel(item.label)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="costCenterId" className="text-sm font-medium">Cost Center (optional)</label>
              <AsyncSearchableSelect
                value={form.watch("costCenterId") ?? ""}
                onChange={(v) => form.setValue("costCenterId", v)}
                fetchFn={fetchCostCenters}
                selectedLabel={costCenterLabel}
                placeholder="None"
                searchPlaceholder="Search cost centers…"
                onSelectItem={(item) => setCostCenterLabel(item.label)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold">Expense Lines</h2>
            <ExpenseLineTable
              lines={lines}
              onChange={(next) => { setLines(next); setLinesError(""); }}
              error={linesError}
            />
          </div>

          <DynamicFields
            module="expenses"
            values={customFields}
            onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))}
          />

          <FormActions
            isSubmitting={mutation.isPending}
            onCancel={() => navigate(backTo)}
            submitLabel={mode === "create" ? "Add Expense Report" : "Update Expense Report"}
          />
        </form>
      </Form>
    </EntityFormPage>
  );
}
