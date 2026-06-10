import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import CustomerForm from "./CustomerForm";
import LoadingSpinner from "@/components/common/spinner";
import { queryKeys } from "@/lib/queryKeys";
import { getCustomerById } from "@/utils/api";
import { toCustomFieldValues } from "@/utils/customFields";

const EditCustomer = () => {
  const { id } = useParams<{ id: string }>();

  const customerQuery = useQuery({
    queryKey: id ? queryKeys.customers.detail(id) : ["customers", "missing-id"],
    queryFn: () => getCustomerById(id!),
    enabled: Boolean(id),
  });

  if (customerQuery.isPending) return <LoadingSpinner loading />;

  if (!id || customerQuery.isError || !customerQuery.data?.data) {
    return <div className="p-6 text-sm text-destructive">Unable to load customer.</div>;
  }

  const customer = customerQuery.data.data;

  return (
    <CustomerForm
      mode="edit"
      id={id}
      initialValues={customer}
      initialCustomFields={toCustomFieldValues(customer.customFields)}
    />
  );
};

export default EditCustomer;
