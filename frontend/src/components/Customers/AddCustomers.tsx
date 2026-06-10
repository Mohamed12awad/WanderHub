import { useLocation } from "react-router-dom";
import CustomerForm from "./CustomerForm";
import { toCustomFieldValues } from "@/utils/customFields";

const AddCustomer = () => {
  const location = useLocation();
  const cloneData = (location.state as { clone?: Record<string, unknown> } | null)?.clone;

  return (
    <CustomerForm
      mode="create"
      initialValues={cloneData}
      initialCustomFields={toCustomFieldValues(cloneData?.customFields)}
    />
  );
};

export default AddCustomer;
