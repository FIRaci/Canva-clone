"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { ActiveTool } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FolderSidebarProps {
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const FolderSidebar = ({
  activeTool,
  onChangeActiveTool,
}: FolderSidebarProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, isLoading, isError } = useGetProjects();

  const projects = useMemo(() => {
    const allProjects = data?.pages.flatMap((group) => group.data) ?? [];
    const normalized = query.trim().toLowerCase();

    if (!normalized) return allProjects;

    return allProjects.filter((project) =>
      project.name.toLowerCase().includes(normalized),
    );
  }, [data?.pages, query]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "folder" ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="Folders"
        description="Browse all created projects"
      />

      <div className="px-4 pt-4 pb-3 border-b">
        <div className="relative">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by project name"
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea>
        <div className="p-4 space-y-3">
          <p className="text-sm font-medium">Designs</p>

          {isLoading && (
            <p className="text-xs text-muted-foreground">Loading projects...</p>
          )}

          {isError && (
            <p className="text-xs text-muted-foreground">Unable to load projects</p>
          )}

          {!isLoading && !isError && projects.length === 0 && (
            <p className="text-xs text-muted-foreground">No projects found</p>
          )}

          {!isLoading && !isError && projects.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => router.push(`/editor/${project.id}`)}
                  className="group rounded-lg border bg-white text-left overflow-hidden transition hover:border-primary/40 hover:shadow-sm"
                  aria-label={`Open ${project.name}`}
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    {project.thumbnailUrl ? (
                      <Image
                        src={project.thumbnailUrl}
                        alt={project.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100" />
                    )}
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="truncate text-xs font-medium" title={project.name}>
                      {project.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      presentation
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
