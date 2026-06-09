import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader, Upload } from "lucide-react";
import { toast } from "sonner";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { useGetImages } from "@/features/images/api/use-get-images";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageSidebarProps {
  projectId: string;
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

type UploadedProjectImage = {
  id: string;
  name: string;
  dataUrl: string;
};

export const ImageSidebar = ({ projectId, editor, activeTool, onChangeActiveTool }: ImageSidebarProps) => {
  const { data, isLoading, isError } = useGetImages();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedProjectImage[]>([]);

  const storageKey = useMemo(() => `project-uploaded-images:${projectId}`, [projectId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);

      if (!raw) {
        setUploadedImages([]);
        return;
      }

      const parsed = JSON.parse(raw) as UploadedProjectImage[];
      if (!Array.isArray(parsed)) {
        setUploadedImages([]);
        return;
      }

      setUploadedImages(
        parsed.filter(
          (image) =>
            typeof image?.id === "string" &&
            typeof image?.name === "string" &&
            typeof image?.dataUrl === "string",
        ),
      );
    } catch {
      setUploadedImages([]);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(uploadedImages));
  }, [storageKey, uploadedImages]);

  const addImageFromFile = (file: File | null | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        editor?.addImage(result);
        setUploadedImages((current) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            dataUrl: result,
          },
          ...current,
        ]);
        toast.success("Image added");
      } else {
        toast.error("Failed to read image file");
      }
    };

    reader.onerror = () => {
      toast.error("Failed to upload image");
    };

    reader.readAsDataURL(file);
  };

  const onUploadLocalImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    addImageFromFile(file);
    event.target.value = "";
  };

  const filteredImages = useMemo(() => {
    if (!data) return [];

    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return data;

    return data.filter((image) => {
      const byAlt = image.alt_description?.toLowerCase().includes(keyword);
      const byAuthor = image.user.name.toLowerCase().includes(keyword);

      return Boolean(byAlt || byAuthor);
    });
  }, [data, searchValue]);

  const filteredUploadedImages = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return uploadedImages;

    return uploadedImages.filter((image) => image.name.toLowerCase().includes(keyword));
  }, [uploadedImages, searchValue]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "images" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Images" description="Add images to your canvas" />
      <div className="p-4 border-b">
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by image name"
          className="mb-3"
        />
        <Button
          type="button"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 size-4" />
          Upload Image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUploadLocalImage}
        />

        <div
          className={cn(
            "mt-3 flex h-28 w-full items-center justify-center rounded-md border-2 border-dashed px-4 text-center text-sm text-muted-foreground transition",
            isDragging && "border-primary bg-primary/5 text-primary"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);

            const file = event.dataTransfer.files?.[0];
            addImageFromFile(file);
          }}
        >
          Drop content here
        </div>
      </div>
      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <Loader className="size-4 text-muted-foreground animate-spin" />
        </div>
      )}
      {isError && (
        <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">Failed to fetch images</p>
        </div>
      )}
      <ScrollArea>
        <div className="p-4">
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Uploaded In This Project
            </p>
            {filteredUploadedImages.length === 0 ? (
              <div className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                No uploaded images yet
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredUploadedImages.map((image) => (
                  <button
                    type="button"
                    onClick={() => editor?.addImage(image.dataUrl)}
                    key={image.id}
                    className="relative w-full h-[100px] group hover:opacity-80 transition bg-muted rounded-sm overflow-hidden border"
                    title={image.name}
                  >
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <p className="absolute left-0 bottom-0 w-full truncate bg-black/50 px-1 py-1 text-left text-[10px] text-white">
                      {image.name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stock Images</p>
          <div className="grid grid-cols-2 gap-4">
            {filteredImages.map((image) => {
                return (
                  <button
                    onClick={() => editor?.addImage(image.urls.regular)}
                    key={image.id}
                    className="relative w-full h-[100px] group hover:opacity-75 transition bg-muted rounded-sm overflow-hidden border"
                  >
                    <img
                      src={image?.urls?.small || image?.urls?.thumb}
                      alt={image.alt_description || "Image"}
                      className="object-cover"
                      loading="lazy"
                    />
                    <Link
                      target="_blank"
                      href={image.links.html}
                      className="opacity-0 group-hover:opacity-100 absolute left-0 bottom-0 w-full text-[10px] truncate text-white hover:underline p-1 bg-black/50 text-left"
                    >
                      {image.user.name}
                    </Link>
                  </button>
                );
              })}
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
