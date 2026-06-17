import { useMemo } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import { getProjects, deleteProject } from "@/utils/api";
import ProjectRow from "./ProjectRow";
import { ViewToggle } from "./ViewToggle";
import { useLanguage } from "@/contexts/LanguageContext";

export function Projects() {
  const { tr } = useLanguage();
  const p = tr.projects;

  // Status options reuse the shared project status labels; memoized on `tr` so
  // they re-localize on language change without reallocating each render.
  const statusOptions = useMemo(
    () => ["planning", "active", "on_hold", "completed", "cancelled"]
      .map((value) => ({ value, label: p.statuses[value] })),
    [p],
  );

  return (
    <GenericTable
      queryKey="projects"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getProjects({ page, limit, q, ...(sort ? { sort, dir } : {}), ...(filters ?? {}) })
      }
      deleteData={deleteProject}
      headers={p.headers}
      sortableHeaders={[p.headers[0]]}
      renderRow={(item: Record<string, unknown>, handleDelete) => (
        <ProjectRow key={item._id as string} {...(item as any)} handleDelete={handleDelete} />
      )}
      title={p.title}
      description={p.description}
      addLink="/projects/new"
      addLabel={p.add}
      module="projects"
      importConfig={{ entity: "projects", title: "Projects", permission: "projects:create" }}
      exportConfig={{ entity: "projects", filename: "projects" }}
      topContent={<div className="flex justify-end"><ViewToggle active="list" /></div>}
      quickStatusFilter={{ field: "status", options: statusOptions }}
    />
  );
}
