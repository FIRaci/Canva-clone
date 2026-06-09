"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Home, LayoutTemplate, Loader2, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { useCreateProject } from "@/features/projects/api/use-create-project";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SidebarItem } from "./sidebar-item";

interface SidebarRoutesProps {
  collapsed: boolean;
}

export const SidebarRoutes = ({ collapsed }: SidebarRoutesProps) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeSection, setActiveSection] = useState<"design" | "upload" | null>(null);
  const [width, setWidth] = useState("900");
  const [height, setHeight] = useState("1200");
  const createMutation = useCreateProject();
  const pathname = usePathname();
  const { t } = useLanguage();

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

  const createAndOpen = (name: string, projectWidth: number, projectHeight: number) => {
    createMutation.mutate(
      { name, json: "", width: projectWidth, height: projectHeight },
      {
        onSuccess: ({ data }) => {
          setOpen(false);
          setActiveSection(null);
          router.push(`/editor/${data.id}`);
        },
      }
    );
  };

  const onCreateDesign = () => {
    const nextWidth = Number(width);
    const nextHeight = Number(height);

    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth <= 0 || nextHeight <= 0) {
      toast.error(t.validSizeError);
      return;
    }

    createAndOpen(t.untitledProject, nextWidth, nextHeight);
  };

  const onUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      toast.error(t.onlyPptxSupported);
      event.target.value = "";
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
      setOpen(false);
      setActiveSection(null);
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
        setOpen(false);
        setActiveSection(null);
        router.push(`/editor/${created.data.id}`);
      } catch {
        toast.error(t.failedImportPptx);
      }
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-y-4 flex-1">
      <div className="px-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={createMutation.isPending || isImporting}
              className={collapsed ? "w-full px-0" : "w-full justify-start"}
              aria-label={t.create}
            >
              {createMutation.isPending || isImporting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {!collapsed && <span className="ml-2">{t.create}</span>}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.addNew}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setActiveSection("design")}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left text-sm font-medium transition hover:bg-accent"
              >
                <LayoutTemplate className="size-4" />
                <span>{t.design}</span>
              </button>

              {activeSection === "design" && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t.widthPx}</p>
                      <Input value={width} onChange={(event) => setWidth(event.target.value)} inputMode="numeric" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t.heightPx}</p>
                      <Input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="numeric" />
                    </div>
                  </div>
                  <Button onClick={onCreateDesign} disabled={createMutation.isPending} className="w-full">
                    {createMutation.isPending ? t.creating : t.createDesign}
                  </Button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveSection("upload")}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left text-sm font-medium transition hover:bg-accent"
              >
                <FileUp className="size-4" />
                <span>{t.uploadFiles}</span>
              </button>

              {activeSection === "upload" && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{t.choosePptxDescription}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={createMutation.isPending || isImporting}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {createMutation.isPending || isImporting ? t.uploading : t.choosePptx}
                  </Button>
                </div>
              )}
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
      </div>
      <ul className="flex flex-col gap-y-1 px-3">
        <SidebarItem href="/" icon={Home} label={t.home} isActive={pathname === "/"} collapsed={collapsed} />
        <SidebarItem
          href="/templates"
          icon={LayoutTemplate}
          label={t.templates}
          isActive={pathname === "/templates"}
          collapsed={collapsed}
        />
      </ul>
    </div>
  );
};
