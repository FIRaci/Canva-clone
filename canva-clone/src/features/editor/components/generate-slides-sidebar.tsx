"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Presentation,
  ChevronDown,
  Check,
  Wand2,
  LayoutGrid,
} from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedSlide {
  id: string;
  title: string;
  json: string;
  width: number;
  height: number;
}

interface GenerateSlidesSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
  onApplyGeneratedSlides: (slides: GeneratedSlide[]) => void;
}

// ── Style options ─────────────────────────────────────────────────────────────

const STYLE_OPTIONS = [
  { value: "professional", label: "Professional", emoji: "💼", colors: ["#2563EB", "#1E3A5F", "#FFFFFF"] },
  { value: "creative", label: "Creative", emoji: "🎨", colors: ["#F97316", "#9A3412", "#FFF7ED"] },
  { value: "minimal", label: "Minimal", emoji: "✨", colors: ["#18181B", "#09090B", "#FAFAFA"] },
  { value: "dark", label: "Dark", emoji: "🌙", colors: ["#38BDF8", "#F1F5F9", "#0F172A"] },
] as const;

const SLIDE_COUNTS = [3, 5, 7] as const;

const QUICK_PROMPTS = [
  "Giới thiệu công ty startup công nghệ",
  "Lợi ích của AI trong giáo dục",
  "Kế hoạch marketing Q3 2025",
  "Hướng dẫn sử dụng sản phẩm mới",
  "Báo cáo kết quả kinh doanh",
];

// ── Component ─────────────────────────────────────────────────────────────────

export const GenerateSlidesSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
  onApplyGeneratedSlides,
}: GenerateSlidesSidebarProps) => {
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState<number>(5);
  const [style, setStyle] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<GeneratedSlide[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  const selectedStyle = STYLE_OPTIONS.find((s) => s.value === style) ?? STYLE_OPTIONS[0];

  const onGenerate = async () => {
    const text = prompt.trim();
    if (!text || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedSlides([]);

    try {
      const res = await fetch("/api/ai/generate-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, slideCount, style }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { slides: GeneratedSlide[] };

      if (!data.slides || data.slides.length === 0) {
        throw new Error("Không nhận được slide nào từ AI.");
      }

      setGeneratedSlides(data.slides);
    } catch (err) {
      setError((err as Error).message || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onApply = () => {
    if (generatedSlides.length === 0 || !editor) return;
    onApplyGeneratedSlides(generatedSlides);
    setGeneratedSlides([]);
    setPrompt("");
    onChangeActiveTool("select");
  };

  const onQuickPrompt = (p: string) => {
    setPrompt(p);
    setGeneratedSlides([]);
    setError(null);
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "generate-slides" ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="AI Slides"
        description="Tạo bài thuyết trình bằng AI"
      />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
              Mô tả bài thuyết trình
            </label>
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(null); }}
              placeholder="VD: Giới thiệu lợi ích của AI trong giáo dục hiện đại..."
              rows={3}
              disabled={isGenerating}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-60"
            />
          </div>

          {/* Quick Prompts */}
          {!generatedSlides.length && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Gợi ý nhanh</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => onQuickPrompt(p)}
                    disabled={isGenerating}
                    className="text-[11px] px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-100 transition-colors disabled:opacity-50 leading-relaxed"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Options Row */}
          <div className="flex gap-3">
            {/* Slide Count */}
            <div className="flex-1 space-y-1.5">
              <label className="text-[11px] font-medium text-gray-500">Số slide</label>
              <div className="flex gap-1">
                {SLIDE_COUNTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSlideCount(n)}
                    disabled={isGenerating}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-lg border transition-all",
                      slideCount === n
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector */}
            <div className="flex-1 space-y-1.5">
              <label className="text-[11px] font-medium text-gray-500">Phong cách</label>
              <div className="relative">
                <button
                  onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                  disabled={isGenerating}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs hover:border-indigo-300 transition-colors disabled:opacity-60"
                >
                  <span>{selectedStyle.emoji}</span>
                  <span className="flex-1 text-left font-medium text-gray-700">{selectedStyle.label}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {showStyleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    {STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setStyle(opt.value); setShowStyleDropdown(false); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors",
                          style === opt.value && "bg-indigo-50",
                        )}
                      >
                        <span>{opt.emoji}</span>
                        <span className="flex-1 text-left font-medium text-gray-700">{opt.label}</span>
                        <div className="flex gap-0.5">
                          {opt.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-full border border-gray-200"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        {style === opt.value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold transition-all",
              isGenerating
                ? "bg-indigo-100 text-indigo-400 cursor-wait"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]",
              (!prompt.trim() && !isGenerating) && "opacity-50 cursor-not-allowed",
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tạo slides...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Tạo bài thuyết trình
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Loading Animation */}
          {isGenerating && (
            <div className="space-y-3 animate-pulse">
              <div className="flex items-center gap-2 text-xs text-indigo-600">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                AI đang thiết kế {slideCount} slides...
              </div>
              {Array.from({ length: slideCount }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-16 flex items-center px-3 gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-200 rounded-full w-3/4" />
                    <div className="h-2 bg-gray-200 rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generated Slides Preview */}
          {generatedSlides.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-xs font-semibold text-gray-700">
                    {generatedSlides.length} slides đã tạo
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-emerald-600 font-medium">Sẵn sàng</span>
                </div>
              </div>

              <div className="space-y-2">
                {generatedSlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className="group flex items-center gap-3 p-2.5 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-xl transition-all cursor-default"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {slide.title}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {index === 0
                          ? "Title Slide"
                          : index === generatedSlides.length - 1
                            ? "Closing Slide"
                            : "Content Slide"}
                      </p>
                    </div>
                    <Presentation className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                  </div>
                ))}
              </div>

              {/* Apply Button */}
              <button
                onClick={onApply}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                Áp dụng tất cả {generatedSlides.length} slides
              </button>

              {/* Regenerate */}
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-xl transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tạo lại
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

      <ToolSidebarClose onClick={() => onChangeActiveTool("select")} />
    </aside>
  );
};
