"use client";

import {
  FileUp,
  Folder,
  ImageIcon,
  LayoutTemplate,
  Presentation,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ActiveTool } from "@/features/editor/types";
import { SidebarItem } from "@/features/editor/components/sidebar-item";
import { useCreateProject } from "@/features/projects/api/use-create-project";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SidebarProps {
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const Sidebar = ({ activeTool, onChangeActiveTool }: SidebarProps) => {
  const { t } = useLanguage();
  const router = useRouter();
  const createMutation = useCreateProject();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const buildUploadedFallbackJson = (fileName: string, projectWidth: number, projectHeight: number) => {
    const titleSize = Math.max(28, Math.round(projectWidth / 22));
    const subtitleSize = Math.max(16, Math.round(projectWidth / 52));

    return JSON.stringify({
      version: "5.3.0",
      objects: [
        {
          type: "rect",
          version: "5.3.0",
          left: 0,
          top: 0,
          width: projectWidth,
          height: projectHeight,
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
          left: Math.round(projectWidth * 0.08),
          top: Math.round(projectHeight * 0.34),
          width: Math.round(projectWidth * 0.84),
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
          left: Math.round(projectWidth * 0.12),
          top: Math.round(projectHeight * 0.48),
          width: Math.round(projectWidth * 0.76),
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

  const onUploadFileBlob = async (file: File | null | undefined) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      toast.error(t.onlyPptxSupported);
      return;
    }

    const sanitizedName = file.name
      .replace(/\.pptx$/i, "")
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim()
      .slice(0, 120);
    const projectName = sanitizedName || t.uploadedProjectName;

    try {
      setIsImporting(true);

      const formData = new FormData();
      formData.append("file", file);

      const importResponse = await fetch("/api/projects/import-pptx", {
        method: "POST",
        body: formData,
      });

      if (!importResponse.ok) {
        throw new Error(t.failedImportPptx);
      }

      const importBody = (await importResponse.json()) as {
        data?: { json: string; width: number; height: number };
      };

      if (!importBody.data?.json || !importBody.data.width || !importBody.data.height) {
        throw new Error(t.failedImportPptx);
      }

      const created = await createMutation.mutateAsync({
        name: projectName,
        json: importBody.data.json,
        width: importBody.data.width,
        height: importBody.data.height,
      });

      toast.success(t.pptxImported);
      setIsUploadModalOpen(false);
      router.push(`/editor/${created.data.id}`);
    } catch {
      try {
        const created = await createMutation.mutateAsync({
          name: projectName,
          json: buildUploadedFallbackJson(projectName, 1920, 1080),
          width: 1920,
          height: 1080,
        });

        toast.success(t.pptxImported);
        setIsUploadModalOpen(false);
        router.push(`/editor/${created.data.id}`);
      } catch {
        toast.error(t.failedImportPptx);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const onUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    await onUploadFileBlob(file);
    event.target.value = "";
  };

  const onDropUpload = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];
    await onUploadFileBlob(file);
  };

  const onDragOverUpload = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const onDragLeaveUpload = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  return (
    <aside className="bg-white flex flex-col w-[100px] h-full border-r overflow-y-auto">
      <ul className="flex flex-col">
        <SidebarItem
          icon={LayoutTemplate}
          label={t.templates}
          isActive={activeTool === "templates"}
          onClick={() => onChangeActiveTool("templates")}
        />
        <SidebarItem
          icon={FileUp}
          label={t.uploads}
          disabled={createMutation.isPending || isImporting}
          onClick={() => setIsUploadModalOpen(true)}
        />
        <SidebarItem
          icon={ImageIcon}
          label={t.image}
          isActive={activeTool === "images"}
          onClick={() => onChangeActiveTool("images")}
        />
        <SidebarItem
          icon={Wrench}
          label={t.tools}
          isActive={activeTool === "tools"}
          onClick={() => onChangeActiveTool("tools")}
        />
        <SidebarItem
          icon={Folder}
          label={t.projects}
          isActive={activeTool === "folder"}
          onClick={() => onChangeActiveTool("folder")}
        />
        <SidebarItem
          icon={Sparkles}
          label="AI"
          isActive={activeTool === "ai"}
          onClick={() => onChangeActiveTool("ai")}
        />
        <SidebarItem
          icon={Presentation}
          label="AI Slides"
          isActive={activeTool === "generate-slides"}
          onClick={() => onChangeActiveTool("generate-slides")}
        />
        <SidebarItem
          icon={Settings}
          label="Settings"
          isActive={activeTool === "settings"}
          onClick={() => onChangeActiveTool("settings")}
        />
      </ul>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        onChange={onUploadFile}
      />

      <Dialog
        open={isUploadModalOpen}
        onOpenChange={(next) => {
          if (isImporting) return;
          setIsUploadModalOpen(next);
          if (!next) setIsDragActive(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.upload}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div
              onDrop={onDropUpload}
              onDragOver={onDragOverUpload}
              onDragLeave={onDragLeaveUpload}
              className={`flex h-40 items-center justify-center rounded-lg border-2 border-dashed text-sm transition ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/20"
              }`}
            >
              <span className="text-muted-foreground">{t.dropContentHere}</span>
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={createMutation.isPending || isImporting}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="size-4 mr-2" />
                {createMutation.isPending || isImporting ? t.uploading : t.uploadFilesAction}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
};
