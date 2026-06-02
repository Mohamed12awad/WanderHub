import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLeadById } from "@/utils/api";
import { LeadForm } from "./LeadForm";
import LoadingSpinner from "@/components/common/spinner";
import { useLanguage } from "@/contexts/LanguageContext";

export function EditLead() {
  const { tr } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { data, isPending } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLeadById(id!),
    enabled: !!id
  });
  const lead = data?.data;

  if (isPending) return <LoadingSpinner loading />;
  if (!lead) return <div className="p-4 text-destructive">{tr.common.errorLoading}</div>;

  return (
    <LeadForm
      mode="edit"
      id={id}
      ownerLabel={lead.owner?.name}
      defaultValues={{
        name:               lead.name ?? "",
        company:            lead.company ?? "",
        jobTitle:           lead.jobTitle ?? "",
        email:              lead.email ?? "",
        phone:              lead.phone ?? "",
        mobile:             lead.mobile ?? "",
        website:            lead.website ?? "",
        city:               lead.city ?? "",
        country:            lead.country ?? "",
        source:             lead.source ?? "",
        campaign:           lead.campaign ?? "",
        status:             lead.status ?? "new",
        rating:             lead.rating ?? "",
        budget:             lead.budget?.toString() ?? "",
        currency:           lead.currency ?? "EGP",
        expectedCloseDate:  lead.expectedCloseDate ? lead.expectedCloseDate.split("T")[0] : "",
        lostReason:         lead.lostReason ?? "",
        notes:              lead.notes ?? "",
        owner:              lead.owner?._id ?? "",
      }}
    />
  );
}
