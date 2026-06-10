import { useLocation } from "react-router-dom";
import { ExpenseForm } from "./ExpenseForm";
import { toCustomFieldValues } from "@/utils/customFields";

const AddExpenseReport = () => {
  const location = useLocation();
  const clone = (location.state as any)?.clone;
  const defaultValues = clone
    ? { title: clone.title ?? "", project: clone.project ?? "", expenses: clone.expenses, customFields: clone.customFields ? toCustomFieldValues(clone.customFields) : {} }
    : undefined;
  return <ExpenseForm mode="create" defaultValues={defaultValues} />;
};

export default AddExpenseReport;
