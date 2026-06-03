import { useLocation } from "react-router-dom";
import { LeadForm } from "./LeadForm";

export function AddLead() {
  const location = useLocation();
  const clone = (location.state as any)?.clone;
  return <LeadForm mode="create" defaultValues={clone} />;
}
