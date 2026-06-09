"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/language-context";
import { useCreateProject } from "@/features/projects/api/use-create-project";
import { useGetTemplates } from "@/features/projects/api/use-get-templates";
import { DEMO_TEMPLATES, DemoTemplate } from "./templates/templates-data";

type TemplateSlidePreview = {
  id: string;
  thumbnailUrl: string;
  width: number;
  height: number;
};

type TemplateGalleryItem = DemoTemplate & {
  source: "demo" | "remote";
  authorName: string;
  authorAvatarUrl?: string;
  slides: TemplateSlidePreview[];
};

const createPlaceholderSlideThumbnail = (width: number, height: number, title: string) => {
  const safeTitle = title.replace(/&/g, "and");
  const svg = [
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'>`,
    "<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='#e0e7ff'/><stop offset='100%' stop-color='#bfdbfe'/></linearGradient></defs>",
    "<rect width='100%' height='100%' fill='url(#g)'/>",
    `<text x='120' y='240' font-size='96' font-family='Arial' font-weight='700' fill='#0f172a'>${safeTitle}</text>`,
    "</svg>",
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const extractSlidesFromTemplate = (
  json: string,
  fallbackThumbnail: string,
  width: number,
  height: number,
  title: string,
) => {
  try {
    const parsed = JSON.parse(json) as {
      version?: string;
      slides?: Array<{ id?: string; thumbnailUrl?: string; width?: number; height?: number }>;
    };

    if (parsed.version === "multi-slide-v1" && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
      return parsed.slides.map((slide, index) => ({
        id: slide.id || `slide-${index + 1}`,
        thumbnailUrl:
          slide.thumbnailUrl ||
          fallbackThumbnail ||
          createPlaceholderSlideThumbnail(width, height, `${title} ${index + 1}`),
        width: slide.width || width,
        height: slide.height || height,
      }));
    }
  } catch {
    // Ignore parse errors and fallback to single-slide preview.
  }

  return [
    {
      id: "slide-1",
      thumbnailUrl: fallbackThumbnail || createPlaceholderSlideThumbnail(width, height, title),
      width,
      height,
    },
  ];
};

export const TemplatesContent = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportingTemplate, setIsImportingTemplate] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateGalleryItem | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const createMutation = useCreateProject();
  const { data: uploadedTemplates = [] } = useGetTemplates({ page: "1", limit: "50" });

  const combinedTemplates = useMemo(() => {
    const remoteTemplates: TemplateGalleryItem[] = uploadedTemplates.map((template) => {
      const slides = extractSlidesFromTemplate(
        template.json,
        template.thumbnailUrl || "",
        template.width,
        template.height,
        template.name,
      );

      return {
        id: `remote-${template.id}`,
        name: template.name,
        width: template.width,
        height: template.height,
        json: template.json,
        thumbnailDataUrl: slides[0]?.thumbnailUrl || "",
        source: "remote",
        authorName: template.userName || t.unknownUser,
        authorAvatarUrl: template.userImage || "",
        slides,
      };
    });

    const localTemplates: TemplateGalleryItem[] = DEMO_TEMPLATES.map((template) => ({
      ...template,
      source: "demo",
      authorName: "SlideRaku",
      authorAvatarUrl: "",
      slides: extractSlidesFromTemplate(
        template.json,
        template.thumbnailDataUrl,
        template.width,
        template.height,
        template.name,
      ),
    }));

    return [...localTemplates, ...remoteTemplates];
  }, [uploadedTemplates, t.unknownUser]);

  const filteredTemplates = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) {
      return combinedTemplates;
    }

    return combinedTemplates.filter((template) => template.name.toLowerCase().includes(normalized));
  }, [combinedTemplates, searchQuery]);

  const moreLikeThisTemplates = useMemo(() => {
    if (!previewTemplate) {
      return [];
    }

    const templatesPool = filteredTemplates.length > 1 ? filteredTemplates : combinedTemplates;

    return templatesPool.filter((template) => template.id !== previewTemplate.id).slice(0, 6);
  }, [combinedTemplates, filteredTemplates, previewTemplate]);

  const onCustomizeTemplate = (template: TemplateGalleryItem) => {
    createMutation.mutate(
      {
        name: `${template.name} project`,
        json: template.json,
        width: template.width,
        height: template.height,
        thumbnailUrl: template.slides[0]?.thumbnailUrl || template.thumbnailDataUrl,
        isTemplate: false,
      },
      {
        onSuccess: ({ data }) => {
          setPreviewTemplate(null);
          setPreviewSlideIndex(0);
          router.push(`/editor/${data.id}`);
        },
      },
    );
  };

  const onOpenTemplatePreview = (template: TemplateGalleryItem) => {
    setPreviewTemplate(template);
    setPreviewSlideIndex(0);
  };

  const onUploadTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
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
    const templateName = sanitizedName || t.uploadedTemplateName;

    try {
      setIsImportingTemplate(true);

      const formData = new FormData();
      formData.append("file", file);

      const importResponse = await fetch("/api/projects/import-pptx", {
        method: "POST",
        body: formData,
      });

      if (!importResponse.ok) {
        throw new Error(t.failedImportTemplate);
      }

      const importBody = (await importResponse.json()) as {
        data?: { json: string; width: number; height: number };
      };

      if (!importBody.data?.json || !importBody.data.width || !importBody.data.height) {
        throw new Error(t.failedImportTemplate);
      }

      const slides = extractSlidesFromTemplate(
        importBody.data.json,
        "",
        importBody.data.width,
        importBody.data.height,
        templateName,
      );

      await createMutation.mutateAsync({
        name: templateName,
        json: importBody.data.json,
        width: importBody.data.width,
        height: importBody.data.height,
        thumbnailUrl: slides[0]?.thumbnailUrl,
        isTemplate: true,
        isPro: false,
      });

      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(t.templateUploaded);
    } catch {
      toast.error(t.failedUploadTemplate);
    } finally {
      setIsImportingTemplate(false);
      event.target.value = "";
    }
  };

  return (
    <div className="mx-auto flex max-w-screen-xl flex-col space-y-6 pb-10">
      <div className="w-full pt-2 text-center md:pt-4">
        <h1
          className="bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 bg-clip-text pb-1 text-3xl font-bold tracking-tight text-transparent md:text-5xl"
          style={{ fontFamily: '"Canva Sans", "Avenir Next", "Nunito Sans", sans-serif' }}
        >
          {t.templates}
        </h1>
      </div>

      <div className="relative mx-auto w-full max-w-2xl">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t.searchTemplatesPlaceholder}
          className="h-12 rounded-full bg-card pl-11 pr-4 text-sm shadow-sm"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t.discoverTemplates}</h3>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImportingTemplate}
          className="gap-2"
        >
          {isImportingTemplate ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          {t.uploadTemplate}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="hidden"
          onChange={onUploadTemplate}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            disabled={createMutation.isPending}
            onClick={() => onOpenTemplatePreview(template)}
            className="group text-left disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div
              className="relative overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md"
              style={{ aspectRatio: `${template.width}/${template.height}` }}
            >
              <Image
                fill
                src={template.thumbnailDataUrl}
                alt={template.name}
                className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </div>
          </button>
        ))}
      </div>

      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTemplate(null);
            setPreviewSlideIndex(0);
          }
        }}
      >
        <DialogContent className="max-w-5xl p-0">
          <DialogTitle className="sr-only">{t.templatePreview}</DialogTitle>
          {previewTemplate && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="border-b p-4 md:border-b-0 md:border-r">
                  <div
                    className="relative overflow-hidden rounded-xl border bg-muted"
                    style={{
                      aspectRatio: `${previewTemplate.slides[previewSlideIndex]?.width || previewTemplate.width}/${previewTemplate.slides[previewSlideIndex]?.height || previewTemplate.height}`,
                    }}
                  >
                    <Image
                      fill
                      src={previewTemplate.slides[previewSlideIndex]?.thumbnailUrl || previewTemplate.thumbnailDataUrl}
                      alt={`${previewTemplate.name} preview`}
                      className="object-cover"
                    />
                  </div>

                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {previewTemplate.slides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md border transition ${
                          index === previewSlideIndex ? "border-primary ring-2 ring-primary/30" : "border-border"
                        }`}
                        onClick={() => setPreviewSlideIndex(index)}
                      >
                        <Image
                          fill
                          src={slide.thumbnailUrl}
                          alt={`Slide ${index + 1}`}
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col p-5">
                  <h3 className="text-2xl font-semibold leading-snug">{previewTemplate.name}</h3>

                  <div className="mt-4 flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarImage src={previewTemplate.authorAvatarUrl} />
                      <AvatarFallback>{previewTemplate.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-muted-foreground">{t.byAuthor} {previewTemplate.authorName}</p>
                  </div>

                  <div className="pt-3">
                    <Button
                      className="w-full"
                      onClick={() => onCustomizeTemplate(previewTemplate)}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? t.creating : t.customizeTemplate}
                    </Button>
                  </div>
                </div>
              </div>

              {moreLikeThisTemplates.length > 0 && (
                <div className="border-t p-5">
                  <h4 className="text-sm font-semibold text-foreground">{t.moreLikeThis}</h4>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {moreLikeThisTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => onOpenTemplatePreview(template)}
                        className="group text-left"
                      >
                        <div
                          className="relative overflow-hidden rounded-2xl border bg-card shadow-sm transition group-hover:shadow-md"
                          style={{ aspectRatio: `${template.width}/${template.height}` }}
                        >
                          <Image
                            fill
                            src={template.thumbnailDataUrl}
                            alt={template.name}
                            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
