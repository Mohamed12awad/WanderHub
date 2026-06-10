import { useParams } from "react-router-dom";
import { ExpenseForm } from "./ExpenseForm";

const EditExpenseReport = () => {
  const { id } = useParams<{ id: string }>();
  return <ExpenseForm mode="edit" id={id} />;
};

export default EditExpenseReport;
