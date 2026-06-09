"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { 
  AlertTriangle, 
  CopyIcon, 
  CopyPlus,
  Download,
  ExternalLink,
  Link2,
  Loader, 
  MoreHorizontal, 
  Pencil,
  Search,
  Trash
} from "lucide-react";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useDeleteProject } from "@/features/projects/api/use-delete-project";
import { useDuplicateProject } from "@/features/projects/api/use-duplicate-project";
import { client } from "@/lib/hono";

import {
  DropdownMenuContent,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { useLanguage } from "@/contexts/language-context";

type Project = InferResponseType<typeof client.api.projects["$get"], 200>["data"][number];

export const ProjectsSection = () => {
  const queryClient = useQueryClient();
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const { t } = useLanguage();
  const [ConfirmDialog, confirm] = useConfirm(
    t.areYouSure,
    t.deleteProjectConfirm,
  );
  const duplicateMutation = useDuplicateProject();
  const removeMutation = useDeleteProject();
  const router = useRouter();
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await client.api.projects[":id"].$patch({
        param: { id },
        json: { name },
      });

      if (!response.ok) {
        throw new Error(t.failedRenameProject);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t.projectRenamed);
    },
    onError: () => {
      toast.error(t.failedRenameProject);
    },
  });

  const onCopy = (id: string) => {
    duplicateMutation.mutate({ id });
  };

  const onStartRename = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const onSubmitRename = (project: Project) => {
    const nextName = editingName.trim();

    if (!nextName || nextName === project.name) {
      setEditingProjectId(null);
      setEditingName("");
      return;
    }

    renameMutation.mutate(
      { id: project.id, name: nextName },
      {
        onSettled: () => {
          setEditingProjectId(null);
          setEditingName("");
        },
      },
    );
  };

  const onOpenNewTab = (id: string) => {
    window.open(`/editor/${id}`, "_blank", "noopener,noreferrer");
  };

  const onCopyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/editor/${id}`);
      toast.success(t.projectLinkCopied);
    } catch {
      toast.error(t.failedCopyProjectLink);
    }
  };

  const getImageDataUrl = async (project: Project) => {
    if (!project.thumbnailUrl) {
      throw new Error(t.noThumbnailAvailable);
    }

    if (project.thumbnailUrl.startsWith("data:")) {
      return project.thumbnailUrl;
    }

    const response = await fetch(project.thumbnailUrl);
    if (!response.ok) {
      throw new Error(t.failedFetchThumbnail);
    }

    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error(t.invalidImageData));
        }
      };
      reader.onerror = () => reject(new Error(t.failedReadThumbnail));
      reader.readAsDataURL(blob);
    });
  };

  const onDownload = async (project: Project, format: "pdf" | "pptx") => {
    try {
      const imageDataUrl = await getImageDataUrl(project);
      const baseName = project.name.replace(/[\\/:*?"<>|]/g, "-").trim() || "project";

      if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({
          orientation: project.width >= project.height ? "landscape" : "portrait",
          unit: "pt",
          format: [project.width, project.height],
        });

        pdf.addImage(imageDataUrl, "JPEG", 0, 0, project.width, project.height);
        pdf.save(`${baseName}.pdf`);
        return;
      }

      const response = await fetch("/api/projects/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl,
          name: project.name,
          width: project.width,
          height: project.height,
        }),
      });

      if (!response.ok) {
        throw new Error(t.failedGeneratePptx);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${baseName}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.failedDownloadProject;
      toast.error(message);
    }
  };

  const onDelete = async (id: string) => {
    const ok = await confirm();

    if (ok) {
      removeMutation.mutate({ id });
    }
  };

  const {
    data,
    status,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useGetProjects();

  if (status === "pending") {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          {t.recents}
        </h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          {t.recents}
        </h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <AlertTriangle className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            {t.failedProjects}
          </p>
        </div>
      </div>
    )
  }

  if (
    !data.pages.length ||
    !data.pages[0].data.length
  ) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          {t.recents}
        </h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <Search className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            {t.noProjectsFound}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4"> 
      <ConfirmDialog />
      <h3 className="font-semibold text-lg">
        {t.recents}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.pages.map((group, i) => (
          <React.Fragment key={i}>
            {group.data.map((project) => (
              <article key={project.id} className="group">
                <div
                  className="relative overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md"
                  style={{ aspectRatio: `${project.width}/${project.height}` }}
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/editor/${project.id}`)}
                    className="absolute inset-0 z-[1]"
                    aria-label={`${t.openProjectAriaPrefix} ${project.name}`}
                  />
                  {project.thumbnailUrl ? (
                    <Image
                      fill
                      src={project.thumbnailUrl}
                      alt={project.name}
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-violet-100 to-blue-100">
                      <p className="px-4 text-center text-sm font-semibold text-indigo-700 line-clamp-2">
                        {project.name}
                      </p>
                    </div>
                  )}

                  <div className="absolute right-2 top-2 z-20">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          disabled={false}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full bg-black/45 text-white hover:bg-black/60 hover:text-white"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60">
                        <DropdownMenuLabel className="px-2 py-2">
                          <div className="flex items-center justify-between gap-2">
                            {editingProjectId === project.id ? (
                              <input
                                autoFocus
                                value={editingName}
                                onChange={(event) => setEditingName(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    onSubmitRename(project);
                                  }

                                  if (event.key === "Escape") {
                                    setEditingProjectId(null);
                                    setEditingName("");
                                  }
                                }}
                                onBlur={() => onSubmitRename(project)}
                                className="h-7 w-full rounded-md border border-input bg-background px-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            ) : (
                              <span className="truncate text-sm font-semibold" title={project.name}>
                                {project.name}
                              </span>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              disabled={renameMutation.isPending}
                              onClick={() => onStartRename(project)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="h-10 cursor-pointer"
                          onClick={() => onOpenNewTab(project.id)}
                        >
                          <ExternalLink className="size-4 mr-2" />
                          {t.openNewTab}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="h-10 cursor-pointer"
                          disabled={duplicateMutation.isPending}
                          onClick={() => onCopy(project.id)}
                        >
                          <CopyPlus className="size-4 mr-2" />
                          {t.makeCopy}
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="h-10">
                            <Download className="size-4 mr-2" />
                            {t.download}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-40">
                            <DropdownMenuItem onClick={() => onDownload(project, "pptx")}>
                              <CopyIcon className="size-4 mr-2" />
                              PPTX
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDownload(project, "pdf")}>
                              <CopyIcon className="size-4 mr-2" />
                              PDF
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem
                          className="h-10 cursor-pointer"
                          onClick={() => onCopyLink(project.id)}
                        >
                          <Link2 className="size-4 mr-2" />
                          {t.copyLink}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="h-10 cursor-pointer"
                          disabled={removeMutation.isPending}
                          onClick={() => onDelete(project.id)}
                        >
                          <Trash className="size-4 mr-2" />
                          {t.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-3 text-left w-full">
                  <button
                    type="button"
                    onClick={() => router.push(`/editor/${project.id}`)}
                    className="text-sm font-semibold text-foreground line-clamp-2 text-left"
                  >
                    {project.name}
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(project.updatedAt, {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </article>
            ))}
          </React.Fragment>
        ))}
      </div>

      {hasNextPage && (
        <div className="w-full flex items-center justify-center pt-4">
          <Button
            variant="ghost"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {t.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
};
