import { useParams } from "react-router-dom";
import { DealForm } from "./DealForm";

const EditDeal = () => {
  const { id } = useParams<{ id: string }>();
  return <DealForm mode="edit" id={id} />;
};

export default EditDeal;
