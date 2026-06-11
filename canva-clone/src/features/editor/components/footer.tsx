import { Copy, GripVertical, Trash2, Minus, Plus } from "lucide-react";
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
    <footer className="h-[112px] border-t bg-white w-full flex items-center z-[50] p-2 gap-x-1 shrink-0 px-4 relative">
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 max-w-[70vw] overflow-x-auto overflow-y-hidden pt-6 pb-2 px-4 scrollbar-hide">
        <div className="flex items-start gap-3">
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
                className="group flex flex-col items-center gap-1 min-w-[84px] shrink-0"
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

                  <div className="absolute -top-4 -right-3 hidden group-hover:flex items-center gap-1 z-50">
                    <div
                      role="button"
                      tabIndex={0}
                      className="h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDuplicateSlide(index);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onDuplicateSlide(index);
                      }}
                      aria-label="Duplicate slide"
                    >
                      <Copy className="size-3 text-slate-600" />
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      className="h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition hover:text-red-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteSlide(index);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onDeleteSlide(index);
                      }}
                      aria-label="Delete slide"
                    >
                      <Trash2 className="size-3" />
                    </div>
                  </div>

                  <div className="absolute -bottom-1 -left-1 h-5 w-5 rounded-full bg-white border border-slate-200 shadow-sm hidden group-hover:flex items-center justify-center z-50 cursor-grab active:cursor-grabbing">
                    <GripVertical className="size-3 text-slate-500" />
                  </div>
                </div>
                <span className="text-[11px] text-slate-600 font-medium">{index + 1}</span>
              </button>
            );
          })}

          <div className="flex flex-col items-center gap-1 min-w-[84px] shrink-0">
            <button
              type="button"
              onClick={onAddSlide}
              className="h-12 w-20 rounded border border-slate-300 bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center hover:bg-slate-200 transition"
              aria-label="Add slide"
            >
              <Plus className="size-5" />
            </button>
            <span className="text-[11px] text-transparent select-none">_</span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 w-[260px] pr-1 justify-end relative z-[60]">
        <button
          onClick={() => {
            const next = Math.max(10, zoomPercent - 10);
            setZoomPercent(next);
            editor?.setZoomPercent(next);
          }}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-200"
        >
          <Minus className="size-4" />
        </button>
        <div className="flex items-center bg-slate-100 rounded-md px-1 focus-within:ring-2 focus-within:ring-blue-500">
          <input 
            type="number"
            value={zoomPercent}
            onChange={(e) => {
              setZoomPercent(Number(e.target.value));
            }}
            onBlur={() => {
              const next = Math.max(10, Math.min(500, zoomPercent));
              setZoomPercent(next);
              editor?.setZoomPercent(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const next = Math.max(10, Math.min(500, zoomPercent));
                setZoomPercent(next);
                editor?.setZoomPercent(next);
              }
            }}
            className="w-10 text-center text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none appearance-none"
            style={{ MozAppearance: 'textfield' }}
          />
          <span className="text-sm font-medium text-slate-700 pr-1">%</span>
        </div>
        <button
          onClick={() => {
            const next = Math.min(500, zoomPercent + 10);
            setZoomPercent(next);
            editor?.setZoomPercent(next);
          }}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-200"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </footer>
  );
};
