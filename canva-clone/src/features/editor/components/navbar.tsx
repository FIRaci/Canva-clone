"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BsCloudCheck, BsCloudSlash } from "react-icons/bs";
import { toast } from "sonner";
import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import { 
  ChevronDown,
  CopyPlus,
  DownloadIcon,
  FileImage,
  FileText,
  FileUp,
  Loader, 
  MessageSquare,
  Pencil,
  Play,
  Plus,
  Redo2, 
  Save,
  Share2,
  Trash,
  Undo2
} from "lucide-react";

import { useCreateProject } from "@/features/projects/api/use-create-project";
import { useDeleteProject } from "@/features/projects/api/use-delete-project";
import { useDuplicateProject } from "@/features/projects/api/use-duplicate-project";

import { ActiveTool, Editor } from "@/features/editor/types";
import { Logo } from "@/features/editor/components/logo";

import { client } from "@/lib/hono";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NavbarProps {
  id: string;
  projectName: string;
  projectWidth: number;
  projectHeight: number;
  projectThumbnailUrl?: string | null;
  slideContainerRef: RefObject<HTMLDivElement>;
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
  onManualSave: () => void;
  onPresentSlide: (slideContainerRef: RefObject<HTMLDivElement>) => Promise<void>;
  onProjectRenamed: (name: string) => void;
};

export const Navbar = ({
  id,
  projectName,
  projectWidth,
  projectHeight,
  projectThumbnailUrl,
  slideContainerRef,
  editor,
  activeTool,
  onChangeActiveTool,
  onManualSave,
  onPresentSlide,
  onProjectRenamed,
}: NavbarProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [downloadType, setDownloadType] = useState<"pptx" | "pdf" | "png">("pptx");
  const [downloadRange, setDownloadRange] = useState("1");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(projectName);
  const [isImporting, setIsImporting] = useState(false);

  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "You are about to delete this project.",
  );
  const createMutation = useCreateProject();
  const duplicateMutation = useDuplicateProject();
  const removeMutation = useDeleteProject();

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await client.api.projects[":id"].$patch({
        param: { id },
        json: { name },
      });

      if (!response.ok) {
        throw new Error("Failed to rename project");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", { id }] });
      onProjectRenamed(variables.name);
      setIsEditingName(false);
      toast.success("Project renamed");
    },
    onError: () => {
      toast.error("Failed to rename project");
    },
  });

  const data = useMutationState({
    filters: {
      mutationKey: ["project", { id }],
      exact: true,
    },
    select: (mutation) => mutation.state.status,
  });

  const currentStatus = data[data.length - 1];

  const isError = currentStatus === "error";
  const isPending = currentStatus === "pending";

  useEffect(() => {
    if (!isEditingName) {
      setEditingName(projectName);
    }
  }, [projectName, isEditingName]);

  const buildUploadedFallbackJson = (fileName: string, nextWidth: number, nextHeight: number) => {
    const titleSize = Math.max(28, Math.round(nextWidth / 22));
    const subtitleSize = Math.max(16, Math.round(nextWidth / 52));

    return JSON.stringify({
      version: "5.3.0",
      objects: [
        {
          type: "rect",
          version: "5.3.0",
          left: 0,
          top: 0,
          width: nextWidth,
          height: nextHeight,
          fill: "white",
          stroke: null,
          strokeWidth: 1,
          selectable: false,
          hasControls: false,
          name: "clip",
          shadow: {
            color: "rgba(0,0,0,0.8)",
            blur: 5,
            offsetX: 0,
            offsetY: 0,
            affectStroke: false,
            nonScaling: false,
          },
        },
        {
          type: "textbox",
          version: "5.3.0",
          left: Math.round(nextWidth * 0.08),
          top: Math.round(nextHeight * 0.34),
          width: Math.round(nextWidth * 0.84),
          fill: "#0f172a",
          fontSize: titleSize,
          fontFamily: "Arial",
          fontWeight: 700,
          textAlign: "center",
          text: `Imported file: ${fileName}`,
          styles: [],
          lineHeight: 1.16,
          charSpacing: 0,
          splitByGrapheme: false,
          selectable: true,
          hasControls: true,
          editable: true,
        },
        {
          type: "textbox",
          version: "5.3.0",
          left: Math.round(nextWidth * 0.12),
          top: Math.round(nextHeight * 0.48),
          width: Math.round(nextWidth * 0.76),
          fill: "#475569",
          fontSize: subtitleSize,
          fontFamily: "Arial",
          fontWeight: 400,
          textAlign: "center",
          text: "Imported slide is ready. You can edit this canvas.",
          styles: [],
          lineHeight: 1.16,
          charSpacing: 0,
          splitByGrapheme: false,
          selectable: true,
          hasControls: true,
          editable: true,
        },
      ],
    });
  };

  const getImageDataUrl = async () => {
    if (!projectThumbnailUrl) {
      throw new Error("No thumbnail available. Please save the project first.");
    }

    if (projectThumbnailUrl.startsWith("data:")) {
      return projectThumbnailUrl;
    }

    const response = await fetch(projectThumbnailUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch thumbnail");
    }

    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Invalid image data"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read thumbnail"));
      reader.readAsDataURL(blob);
    });
  };

  const onDownload = async (format: "pdf" | "pptx") => {
    try {
      const imageDataUrl = await getImageDataUrl();
      const baseName = projectName.replace(/[\\/:*?"<>|]/g, "-").trim() || "project";

      if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({
          orientation: projectWidth >= projectHeight ? "landscape" : "portrait",
          unit: "pt",
          format: [projectWidth, projectHeight],
        });

        pdf.addImage(imageDataUrl, "JPEG", 0, 0, projectWidth, projectHeight);
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
          name: projectName,
          width: projectWidth,
          height: projectHeight,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PPTX");
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
      const message = error instanceof Error ? error.message : "Failed to download project";
      toast.error(message);
    }
  };

  const onSubmitRename = () => {
    const nextName = editingName.trim();

    if (!nextName || nextName === projectName) {
      setEditingName(projectName);
      setIsEditingName(false);
      return;
    }

    renameMutation.mutate({ id, name: nextName });
  };

  const onCreateNewDesign = () => {
    createMutation.mutate(
      {
        name: "Untitled project",
        json: "",
        width: 1920,
        height: 1080,
      },
      {
        onSuccess: ({ data }) => {
          setIsFileDialogOpen(false);
          router.push(`/editor/${data.id}`);
        },
      },
    );
  };

  const onUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      toast.error("Only .pptx files are supported");
      event.target.value = "";
      return;
    }

    const sanitizedName = file.name
      .replace(/\.pptx$/i, "")
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim()
      .slice(0, 120);
    const nextProjectName = sanitizedName || "Imported project";

    try {
      setIsImporting(true);

      const formData = new FormData();
      formData.append("file", file);

      const importResponse = await fetch("/api/projects/import-pptx", {
        method: "POST",
        body: formData,
      });

      if (!importResponse.ok) {
        throw new Error("Failed to import PPTX file");
      }

      const importBody = (await importResponse.json()) as {
        data?: { json: string; width: number; height: number };
      };

      if (!importBody.data?.json || !importBody.data.width || !importBody.data.height) {
        throw new Error("Invalid PPTX import payload");
      }

      const created = await createMutation.mutateAsync({
        name: nextProjectName,
        json: importBody.data.json,
        width: importBody.data.width,
        height: importBody.data.height,
      });

      toast.success("PPTX imported");
      setIsFileDialogOpen(false);
      router.push(`/editor/${created.data.id}`);
    } catch {
      try {
        const created = await createMutation.mutateAsync({
          name: nextProjectName,
          json: buildUploadedFallbackJson(nextProjectName, 1920, 1080),
          width: 1920,
          height: 1080,
        });

        toast.success("PPTX imported");
        setIsFileDialogOpen(false);
        router.push(`/editor/${created.data.id}`);
      } catch {
        toast.error("Failed to import PPTX file");
      }
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const onMakeCopy = () => {
    duplicateMutation.mutate(
      { id },
      {
        onSuccess: ({ data }) => {
          setIsFileDialogOpen(false);
          router.push(`/editor/${data.id}`);
          toast.success("Project duplicated");
        },
      },
    );
  };

  const onDelete = async () => {
    const ok = await confirm();
    if (!ok) return;

    removeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          setIsFileDialogOpen(false);
          router.push("/");
          toast.success("Project deleted");
        },
      },
    );
  };

  const onPresent = async () => {
    try {
      await onPresentSlide(slideContainerRef);
    } catch {
      toast.error("Unable to open fullscreen mode");
    }
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/editor/${id}`);
      toast.success("Project link copied");
    } catch {
      toast.error("Failed to copy project link");
    }
  };

  const onConfirmDownload = async () => {
    const normalizedRange = downloadRange.trim();

    if (!normalizedRange) {
      toast.error("Please enter a page range");
      return;
    }

    if (!/^[0-9,\-\s]+$/.test(normalizedRange)) {
      toast.error("Invalid page range");
      return;
    }

    if (downloadType === "png") {
      editor?.savePng();
      setIsDownloadDialogOpen(false);
      return;
    }

    await onDownload(downloadType);
    setIsDownloadDialogOpen(false);
  };

  const getDownloadTypeLabel = (type: "pptx" | "pdf" | "png") => {
    if (type === "pptx") return "PPTX";
    if (type === "pdf") return "PDF";
    return "PNG";
  };

  const DownloadTypeIcon = downloadType === "png" ? FileImage : FileText;

  return (
    <>
      <ConfirmDialog />
      <nav className="relative w-full flex items-center p-4 h-[68px] gap-x-8 border-b lg:pl-[34px]">
      <Logo />
      <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[40vw] -translate-x-1/2 -translate-y-1/2 truncate text-sm font-semibold text-foreground">
        {projectName}
      </div>
      <div className="w-full flex items-center gap-x-1 h-full">
        <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost">
              File
              <ChevronDown className="size-4 ml-2" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Project</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border p-2">
                {isEditingName ? (
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSubmitRename();
                      }

                      if (event.key === "Escape") {
                        setIsEditingName(false);
                        setEditingName(projectName);
                      }
                    }}
                    onBlur={onSubmitRename}
                    className="h-9"
                  />
                ) : (
                  <p className="flex-1 truncate px-1 text-sm font-semibold" title={projectName}>
                    {projectName}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={renameMutation.isPending}
                  onClick={() => {
                    if (isEditingName) {
                      onSubmitRename();
                      return;
                    }

                    setIsEditingName(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Rename
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full justify-start"
                disabled={createMutation.isPending || isImporting}
                onClick={onCreateNewDesign}
              >
                <Plus className="mr-2 size-4" />
                Create new design
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full justify-start"
                disabled={createMutation.isPending || isImporting}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="mr-2 size-4" />
                Upload files
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full justify-start"
                onClick={() => {
                  onManualSave();
                  toast.success("Project saved");
                }}
              >
                <Save className="mr-2 size-4" />
                Save
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full justify-start"
                disabled={duplicateMutation.isPending}
                onClick={onMakeCopy}
              >
                <CopyPlus className="mr-2 size-4" />
                Make a copy
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full justify-start"
                onClick={() => setIsDownloadDialogOpen(true)}
              >
                <DownloadIcon className="mr-2 size-4" />
                Download
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full justify-start text-destructive hover:text-destructive"
                disabled={removeMutation.isPending}
                onClick={onDelete}
              >
                <Trash className="mr-2 size-4" />
                Delete
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={onUploadFile}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Download</DialogTitle>
              <DialogDescription>
                Choose a file type and the page range to export.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">File type</p>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="inline-flex items-center">
                        <DownloadTypeIcon className="mr-2 size-4" />
                        {getDownloadTypeLabel(downloadType)}
                      </span>
                      <ChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
                    <DropdownMenuItem onClick={() => setDownloadType("pptx")}>
                      <FileText className="mr-2 size-4" />
                      PPTX
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDownloadType("pdf")}>
                      <FileText className="mr-2 size-4" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDownloadType("png")}>
                      <FileImage className="mr-2 size-4" />
                      PNG
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Page range</p>
                <Input
                  value={downloadRange}
                  onChange={(event) => setDownloadRange(event.target.value)}
                  placeholder="Example: 1 or 1-3,5"
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={onConfirmDownload}>
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Separator orientation="vertical" className="mx-2" />
        <Hint label="Undo" side="bottom" sideOffset={10}>
          <Button
            disabled={!editor?.canUndo()}
            variant="ghost"
            size="icon"
            onClick={() => editor?.onUndo()}
          >
            <Undo2 className="size-4" />
          </Button>
        </Hint>
        <Hint label="Redo" side="bottom" sideOffset={10}>
          <Button
            disabled={!editor?.canRedo()}
            variant="ghost"
            size="icon"
            onClick={() => editor?.onRedo()}
          >
            <Redo2 className="size-4" />
          </Button>
        </Hint>
        <Separator orientation="vertical" className="mx-2" />
        {isPending && ( 
          <div className="flex items-center gap-x-2">
            <Loader className="size-4 animate-spin text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              Saving...
            </div>
          </div>
        )}
        {!isPending && isError && ( 
          <div className="flex items-center gap-x-2">
            <BsCloudSlash className="size-[20px] text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              Failed to save
            </div>
          </div>
        )}
        {!isPending && !isError && ( 
          <div className="flex items-center gap-x-2">
            <BsCloudCheck className="size-[20px] text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              Saved
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-x-2">
          <Button
            size="sm"
            variant={activeTool === "chat" ? "secondary" : "ghost"}
            onClick={() => onChangeActiveTool("chat")}
          >
            <MessageSquare className="size-4 mr-2" />
            Chat
          </Button>
          <Button size="sm" variant="ghost" onClick={onPresent}>
            <Play className="size-4 mr-2" />
            Present
          </Button>
          <Button size="sm" variant="ghost" onClick={onShare}>
            <Share2 className="size-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
      </nav>
    </>
  );
};
