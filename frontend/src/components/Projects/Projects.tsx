import { GenericTable } from "@/components/common/GenericTable";
import { getProjects, deleteProject } from "@/utils/api";
import ProjectRow from "./ProjectRow";
import { useLanguage } from "@/contexts/LanguageContext";

export function Projects() {
  const { tr } = useLanguage();
  const p = (tr as any).projects;
  const headers = p?.headers ?? ["Name", "Customer", "Manager", "Status", "Budget", "End Date", ""];

  return (
    <GenericTable
      queryKey="projects"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getProjects({ page, limit, q, ...(sort ? { sort, dir } : {}), ...(filters ?? {}) })
      }
      deleteData={deleteProject}
      headers={headers}
      sortableHeaders={["Name"]}
      renderRow={(item: Record<string, unknown>, handleDelete) => (
        <ProjectRow key={item._id as string} {...(item as any)} handleDelete={handleDelete} />
      )}
      title={p?.title ?? "Projects"}
      description={p?.description ?? "Manage client projects, milestones, and budgets."}
      addLink="/projects/new"
      addLabel={p?.add ?? "Add Project"}
      module="projects"
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "planning", label: "Planning" },
          { value: "active", label: "Active" },
          { value: "on_hold", label: "On Hold" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ],
      }}
    />
  );
}
