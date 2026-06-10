import { useLocation } from "react-router-dom";
import { DealForm } from "./DealForm";

const AddDeal = () => {
  const location = useLocation();
  const clone = (location.state as any)?.clone;
  return <DealForm mode="create" defaultValues={clone} />;
};

export default AddDeal;
