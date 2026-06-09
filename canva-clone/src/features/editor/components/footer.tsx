import { Copy, GripVertical, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Editor } from "@/features/editor/types";

import { Slider } from "@/components/ui/slider";

interface FooterProps {
  editor: Editor | undefined;
  slides: Array<{
    id: string;
    thumbnailUrl?: string;
  }>;
  activeSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onReorderSlides: (fromIndex: number, toIndex: number) => void;
};

export const Footer = ({
  editor,
  slides,
  activeSlideIndex,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onReorderSlides,
}: FooterProps) => {
  const initialZoom = useMemo(() => {
    if (!editor) return 100;
    return Math.max(10, Math.min(500, editor.getZoomPercent()));
  }, [editor]);

  const [zoomPercent, setZoomPercent] = useState(initialZoom);

  useEffect(() => {
    if (!editor) return;
    setZoomPercent(Math.max(10, Math.min(500, editor.getZoomPercent())));
  }, [editor, activeSlideIndex]);

  return (
    <footer className="h-[112px] border-t bg-white w-full flex items-center z-[49] p-2 gap-x-1 shrink-0 px-4 relative">
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 max-w-[70vw] overflow-x-auto">
        <div className="flex items-end gap-3 px-2">
          {slides.map((slide, index) => {
            const isActive = index === activeSlideIndex;

            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => onSelectSlide(index)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", String(index));
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                  if (Number.isFinite(fromIndex)) {
                    onReorderSlides(fromIndex, index);
                  }
                }}
                className="group flex flex-col items-center gap-1 min-w-[84px]"
              >
                <div className="relative">
                  <div
                    className={`h-12 w-20 rounded border transition ${isActive ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-300"}`}
                    style={
                      slide.thumbnailUrl
                        ? {
                            backgroundImage: `url(${slide.thumbnailUrl})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                            backgroundRepeat: "no-repeat",
                          }
                        : { background: "#f8fafc" }
                    }
                  />

                  <div className="absolute -top-2 -right-2 hidden group-hover:flex items-center gap-1">
                    <button
                      type="button"
                      className="h-5 w-5 rounded bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDuplicateSlide(index);
                      }}
                      aria-label="Duplicate slide"
                    >
                      <Copy className="size-3" />
                    </button>
                    <button
                      type="button"
                      className="h-5 w-5 rounded bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteSlide(index);
                      }}
                      aria-label="Delete slide"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>

                  <div className="absolute -bottom-1 -left-1 h-4 w-4 rounded bg-white border border-slate-300 hidden group-hover:flex items-center justify-center">
                    <GripVertical className="size-3 text-slate-500" />
                  </div>
                </div>
                <span className="text-[11px] text-slate-600">{index + 1}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onAddSlide}
            className="h-12 w-20 rounded border border-slate-300 bg-slate-200 text-slate-700 text-lg font-semibold hover:bg-slate-300 transition"
            aria-label="Add slide"
          >
            +
          </button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3 w-[260px] pr-1">
        <Slider
          value={[zoomPercent]}
          min={10}
          max={500}
          step={1}
          onValueChange={(value) => {
            const next = value[0] ?? 100;
            setZoomPercent(next);
            editor?.setZoomPercent(next);
          }}
        />
        <span className="w-14 text-right text-sm font-medium text-slate-700">{zoomPercent}%</span>
      </div>
    </footer>
  );
};
