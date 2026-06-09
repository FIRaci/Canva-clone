"use client";

import { fabric } from "fabric";
import debounce from "lodash.debounce";
import { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Languages,
  Lock,
  PaintRoller,
  SquareSplitHorizontal,
  Trash,
  Unlock,
} from "lucide-react";

import { ResponseType } from "@/features/projects/api/use-get-project";
import { useUpdateProject } from "@/features/projects/api/use-update-project";

import { 
  ActiveTool, 
  JSON_KEYS,
  selectionDependentTools
} from "@/features/editor/types";
import { Navbar } from "@/features/editor/components/navbar";
import { Footer } from "@/features/editor/components/footer";
import { useEditor } from "@/features/editor/hooks/use-editor";
import { Sidebar } from "@/features/editor/components/sidebar";
import { ToolsSidebar } from "@/features/editor/components/tools-sidebar";
import { Toolbar } from "@/features/editor/components/toolbar";
import { ShapeSidebar } from "@/features/editor/components/shape-sidebar";
import { FillColorSidebar } from "@/features/editor/components/fill-color-sidebar";
import { StrokeColorSidebar } from "@/features/editor/components/stroke-color-sidebar";
import { StrokeWidthSidebar } from "@/features/editor/components/stroke-width-sidebar";
import { OpacitySidebar } from "@/features/editor/components/opacity-sidebar";
import { TextSidebar } from "@/features/editor/components/text-sidebar";
import { FontSidebar } from "@/features/editor/components/font-sidebar";
import { ImageSidebar } from "@/features/editor/components/image-sidebar";
import { FilterSidebar } from "@/features/editor/components/filter-sidebar";
import { DrawSidebar } from "@/features/editor/components/draw-sidebar";
import { AiSidebar } from "@/features/editor/components/ai-sidebar";
import { TemplateSidebar } from "@/features/editor/components/template-sidebar";
import { RemoveBgSidebar } from "@/features/editor/components/remove-bg-sidebar";
import { SettingsSidebar } from "@/features/editor/components/settings-sidebar";
import { ChatSidebar } from "@/features/editor/components/chat-sidebar";
import { FolderSidebar } from "@/features/editor/components/folder-sidebar";
import { GenerateSlidesSidebar } from "@/features/editor/components/generate-slides-sidebar";
import { isTextType } from "@/features/editor/utils";

type CanvasContextMenuState = {
  x: number;
  y: number;
};

const TRANSLATE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "vi", label: "Vietnamese" },
  { code: "ja", label: "Japanese" },
] as const;

interface EditorProps {
  initialData: ResponseType["data"];
};

type EditorSlide = {
  id: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl?: string;
};

type MultiSlideProjectPayload = {
  version: "multi-slide-v1";
  activeSlideIndex: number;
  slides: EditorSlide[];
};

const MULTI_SLIDE_VERSION = "multi-slide-v1" as const;

const createSlideId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `slide-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

const createBlankSlideJson = (width: number, height: number) => {
  return JSON.stringify({
    version: "5.3.0",
    objects: [
      {
        type: "rect",
        version: "5.3.0",
        left: 0,
        top: 0,
        width,
        height,
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
    ],
  });
};

const cloneSlide = (slide: EditorSlide): EditorSlide => ({
  ...slide,
  id: createSlideId(),
});

const parseInitialSlides = (initialData: ResponseType["data"]) => {
  const fallbackSlide: EditorSlide = {
    id: createSlideId(),
    json: initialData.json,
    width: initialData.width,
    height: initialData.height,
    thumbnailUrl: initialData.thumbnailUrl ?? undefined,
  };

  try {
    const parsed = JSON.parse(initialData.json) as Partial<MultiSlideProjectPayload>;

    if (parsed?.version !== MULTI_SLIDE_VERSION || !Array.isArray(parsed.slides)) {
      return {
        slides: [fallbackSlide],
        activeSlideIndex: 0,
      };
    }

    const slides = parsed.slides
      .filter((slide) => typeof slide?.json === "string")
      .map((slide) => ({
        id: slide.id || createSlideId(),
        json: slide.json,
        width: Number(slide.width) > 0 ? Number(slide.width) : initialData.width,
        height: Number(slide.height) > 0 ? Number(slide.height) : initialData.height,
        thumbnailUrl: slide.thumbnailUrl,
      }));

    if (slides.length === 0) {
      return {
        slides: [fallbackSlide],
        activeSlideIndex: 0,
      };
    }

    const rawIndex = Number(parsed.activeSlideIndex);
    const activeSlideIndex = Number.isFinite(rawIndex)
      ? Math.max(0, Math.min(slides.length - 1, rawIndex))
      : 0;

    return { slides, activeSlideIndex };
  } catch {
    return {
      slides: [fallbackSlide],
      activeSlideIndex: 0,
    };
  }
};

const getCanvasSnapshot = (canvas: fabric.Canvas) => {
  const currentState = canvas.toJSON(JSON_KEYS);
  const json = JSON.stringify(currentState);

  const workspace = canvas
    .getObjects()
    .find((object) => object.name === "clip");

  const height = workspace?.height || 0;
  const width = workspace?.width || 0;

  let thumbnailUrl: string | undefined;

  if (workspace?.left !== undefined && workspace?.top !== undefined && height > 0 && width > 0) {
    const currentTransform = canvas.viewportTransform;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

    thumbnailUrl = canvas.toDataURL({
      format: "jpeg",
      quality: 0.75,
      left: workspace.left,
      top: workspace.top,
      width,
      height,
      multiplier: 0.3,
    });

    if (currentTransform) {
      canvas.setViewportTransform(currentTransform);
    }
  }

  return {
    json,
    width,
    height,
    thumbnailUrl,
  };
};

export const Editor = ({ initialData }: EditorProps) => {
  const { mutate } = useUpdateProject(initialData.id);
  const initialSlidesData = useMemo(() => parseInitialSlides(initialData), [initialData]);

  const [projectName, setProjectName] = useState(initialData.name);
  const [slides, setSlides] = useState<EditorSlide[]>(initialSlidesData.slides);
  const [activeSlideIndex, setActiveSlideIndex] = useState(initialSlidesData.activeSlideIndex);
  const [isPresenting, setIsPresenting] = useState(false);
  const [lineMode, setLineMode] = useState<"free" | "line" | "arrow">("free");
  const slidesRef = useRef<EditorSlide[]>(initialSlidesData.slides);
  const activeSlideIndexRef = useRef(initialSlidesData.activeSlideIndex);

  const persistProject = useCallback(
    (nextSlides: EditorSlide[], nextActiveSlideIndex: number) => {
      const payload: MultiSlideProjectPayload = {
        version: MULTI_SLIDE_VERSION,
        activeSlideIndex: nextActiveSlideIndex,
        slides: nextSlides,
      };

      const activeSlide = nextSlides[nextActiveSlideIndex] ?? nextSlides[0];
      if (!activeSlide) return;

      mutate({
        json: JSON.stringify(payload),
        width: activeSlide.width,
        height: activeSlide.height,
        thumbnailUrl: activeSlide.thumbnailUrl,
      });
    },
    [mutate],
  );

  const debouncedPersist = useMemo(() => debounce(persistProject, 500), [persistProject]);

  useEffect(() => {
    return () => {
      debouncedPersist.cancel();
    };
  }, [debouncedPersist]);

  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<"layer" | "align" | null>(null);
  const [isTranslatingText, setIsTranslatingText] = useState(false);

  const onClearSelection = useCallback(() => {
    if (selectionDependentTools.includes(activeTool)) {
      setActiveTool("select");
    }
  }, [activeTool]);

  const initialActiveSlide = initialSlidesData.slides[initialSlidesData.activeSlideIndex] ?? initialSlidesData.slides[0];

  const onSaveSlideState = useCallback((values: {
    json: string;
    height: number;
    width: number;
    thumbnailUrl?: string;
  }) => {
    const currentIndex = activeSlideIndexRef.current;
    const baseSlides = slidesRef.current;
    const nextSlides = baseSlides.map((slide, index) => {
      if (index !== currentIndex) return slide;

      return {
        ...slide,
        json: values.json,
        width: values.width,
        height: values.height,
        thumbnailUrl: values.thumbnailUrl ?? slide.thumbnailUrl,
      };
    });

    slidesRef.current = nextSlides;
    setSlides(nextSlides);
    debouncedPersist(nextSlides, currentIndex);
  }, [debouncedPersist]);

  const { init, editor } = useEditor({
    defaultState: initialActiveSlide?.json ?? initialData.json,
    defaultWidth: initialActiveSlide?.width ?? initialData.width,
    defaultHeight: initialActiveSlide?.height ?? initialData.height,
    clearSelectionCallback: onClearSelection,
    saveCallback: onSaveSlideState,
  });
  const editorRef = useRef(editor);
  const fabricCanvas = editor?.canvas;

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const onChangeActiveTool = useCallback((tool: ActiveTool) => {
    if (tool === activeTool) {
      return setActiveTool("select");
    }
    
    setActiveTool(tool);
  }, [activeTool]);

  const getCurrentContextObject = useCallback(() => {
    return editor?.canvas.getActiveObject() as fabric.Object | undefined;
  }, [editor]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setActiveSubmenu(null);
  }, []);

  const markObjectChanged = useCallback((target?: fabric.Object) => {
    if (!editor?.canvas || !target) return;
    editor.canvas.requestRenderAll();
    editor.canvas.fire("object:modified", { target });
  }, [editor]);

  const onCopyStyleForNext = useCallback(() => {
    const object = getCurrentContextObject();
    if (!editor?.canvas || !object) return;

    if (isTextType(object.type)) {
      (editor.canvas as any).__textStyleTemplate = {
        fontFamily: (object as any).fontFamily,
        fontSize: (object as any).fontSize,
        fontWeight: (object as any).fontWeight,
        fontStyle: (object as any).fontStyle,
        underline: (object as any).underline,
        linethrough: (object as any).linethrough,
        fill: (object as any).fill,
        textAlign: (object as any).textAlign,
        charSpacing: (object as any).charSpacing,
        lineHeight: (object as any).lineHeight,
      };
      toast.success("Text style copied");
      return;
    }

    (editor.canvas as any).__objectStyleTemplate = {
      fill: object.get("fill"),
      stroke: object.get("stroke"),
      strokeWidth: object.get("strokeWidth"),
      opacity: object.get("opacity"),
      strokeDashArray: object.get("strokeDashArray"),
    };
    toast.success("Style copied");
  }, [editor, getCurrentContextObject]);

  const onDuplicateObject = useCallback(() => {
    const object = getCurrentContextObject();
    if (!editor?.canvas || !object) return;

    (object as any).clone((cloned: fabric.Object) => {
      cloned.set({
        left: (object.left ?? 0) + 20,
        top: (object.top ?? 0) + 20,
      });
      editor.canvas.add(cloned);
      editor.canvas.setActiveObject(cloned);
      markObjectChanged(cloned);
    });
  }, [editor, getCurrentContextObject, markObjectChanged]);

  const onLayerOrder = useCallback((mode: "bring-forward" | "bring-front" | "send-backward" | "send-back") => {
    const object = getCurrentContextObject();
    if (!editor?.canvas || !object) return;

    if (mode === "bring-forward") {
      (object as any).bringForward?.();
    } else if (mode === "bring-front") {
      (object as any).bringToFront?.();
    } else if (mode === "send-backward") {
      (object as any).sendBackwards?.();
    } else {
      (object as any).sendToBack?.();
    }

    markObjectChanged(object);
  }, [editor, getCurrentContextObject, markObjectChanged]);

  const onToggleLayerLock = useCallback(() => {
    const object = getCurrentContextObject();
    if (!editor?.canvas || !object) return;

    const isLocked = Boolean(
      (object as any).lockMovementX &&
      (object as any).lockMovementY &&
      (object as any).lockRotation &&
      (object as any).lockScalingX &&
      (object as any).lockScalingY,
    );

    const nextLocked = !isLocked;

    object.set({
      lockMovementX: nextLocked,
      lockMovementY: nextLocked,
      lockRotation: nextLocked,
      lockScalingX: nextLocked,
      lockScalingY: nextLocked,
      lockSkewingX: nextLocked,
      lockSkewingY: nextLocked,
      selectable: true,
      evented: true,
      hasControls: !nextLocked,
    });

    if (isTextType(object.type)) {
      (object as any).set({ editable: !nextLocked });
    }

    object.setCoords();
    editor.canvas.setActiveObject(object);
    markObjectChanged(object);
  }, [editor, getCurrentContextObject, markObjectChanged]);

  const onAlignToPage = useCallback((mode: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const object = getCurrentContextObject();
    if (!editor || !object) return;

    const workspace = editor.getWorkspace();
    if (!workspace) return;

    const workspaceBounds = workspace.getBoundingRect(true, true);
    const objectBounds = object.getBoundingRect(true, true);
    const center = object.getCenterPoint();

    let nextX = center.x;
    let nextY = center.y;

    if (mode === "left") {
      nextX = workspaceBounds.left + objectBounds.width / 2;
    } else if (mode === "center") {
      nextX = workspaceBounds.left + workspaceBounds.width / 2;
    } else if (mode === "right") {
      nextX = workspaceBounds.left + workspaceBounds.width - objectBounds.width / 2;
    } else if (mode === "top") {
      nextY = workspaceBounds.top + objectBounds.height / 2;
    } else if (mode === "middle") {
      nextY = workspaceBounds.top + workspaceBounds.height / 2;
    } else {
      nextY = workspaceBounds.top + workspaceBounds.height - objectBounds.height / 2;
    }

    object.setPositionByOrigin(new fabric.Point(nextX, nextY), "center", "center");
    markObjectChanged(object);
  }, [editor, getCurrentContextObject, markObjectChanged]);

  const onTranslateText = useCallback(async (targetLanguage: string) => {
    const object = getCurrentContextObject();
    if (!editor?.canvas || !object || !isTextType(object.type)) return;

    const sourceText = String((object as any).text || "").trim();
    if (!sourceText) {
      toast.info("No text to translate");
      return;
    }

    try {
      setIsTranslatingText(true);
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sourceText,
          targetLanguage,
          sourceLanguage: "auto",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to translate text");
      }

      const body = (await response.json()) as { data?: string };
      const translated = body.data?.trim();

      if (!translated) {
        throw new Error("No translation returned");
      }

      (object as any).set({ text: translated });
      markObjectChanged(object);
      toast.success("Text translated");
    } catch {
      toast.error("Failed to translate text");
    } finally {
      setIsTranslatingText(false);
    }
  }, [editor, getCurrentContextObject, markObjectChanged]);

  useEffect(() => {
    const activeEditor = editorRef.current;
    if (!activeEditor) return;

    const shouldUseFreeDraw = activeTool === "draw" && lineMode === "free";

    if (shouldUseFreeDraw) {
      activeEditor.enableDrawingMode();
      return;
    }

    activeEditor.disableDrawingMode();
  }, [activeTool, lineMode, fabricCanvas]);

  const canvasRef = useRef(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onPresentSlide = useCallback(async (slideContainerRef: RefObject<HTMLDivElement>) => {
    const slideContainer = slideContainerRef.current;
    if (!slideContainer) return;

    if (document.fullscreenElement === slideContainer) {
      await document.exitFullscreen();
      return;
    }

    await slideContainer.requestFullscreen();
  }, []);

  useEffect(() => {
    if (!editor) return;

    const handleFullscreenChange = () => {
      setIsPresenting(document.fullscreenElement === containerRef.current);
      editor.autoZoom();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [editor]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const canvas = fabricCanvas;

    const onMouseDown = (event: fabric.IEvent<MouseEvent>) => {
      if (event.e.button === 2) {
        event.e.preventDefault();

        if (event.target) {
          canvas.setActiveObject(event.target as fabric.Object);
        }

        const activeObject = canvas.getActiveObject();
        if (!activeObject) {
          setContextMenu(null);
          return;
        }

        const menuWidth = 280;
        const menuHeight = 420;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const x = Math.min(event.e.clientX, viewportWidth - menuWidth - 12);
        const y = Math.min(event.e.clientY, viewportHeight - menuHeight - 12);

        setContextMenu({ x: Math.max(8, x), y: Math.max(8, y) });
        return;
      }

      setContextMenu(null);
    };

    const onWindowClick = () => setContextMenu(null);
    const onWindowEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    canvas.on("mouse:down", onMouseDown as any);
    window.addEventListener("click", onWindowClick);
    window.addEventListener("keydown", onWindowEscape);

    return () => {
      canvas.off("mouse:down", onMouseDown as any);
      window.removeEventListener("click", onWindowClick);
      window.removeEventListener("keydown", onWindowEscape);
    };
  }, [fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const canvas = fabricCanvas;
    const previousSkipTargetFind = canvas.skipTargetFind;
    const previousSelection = canvas.selection;
    const previousDefaultCursor = canvas.defaultCursor;

    canvas.skipTargetFind = isPresenting;
    canvas.selection = !isPresenting;
    canvas.defaultCursor = isPresenting ? "pointer" : previousDefaultCursor;

    if (isPresenting) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }

    return () => {
      canvas.skipTargetFind = previousSkipTargetFind;
      canvas.selection = previousSelection;
      canvas.defaultCursor = previousDefaultCursor;
      canvas.requestRenderAll();
    };
  }, [fabricCanvas, isPresenting]);

  useEffect(() => {
    if (!fabricCanvas) return;
    if (activeTool !== "draw") return;
    if (lineMode === "free") return;
    if (isPresenting) return;

    const canvas = fabricCanvas;
    const previousDefaultCursor = canvas.defaultCursor;
    const previousSelection = canvas.selection;
    const previousSkipTargetFind = canvas.skipTargetFind;

    canvas.isDrawingMode = false;
    canvas.defaultCursor = "crosshair";
    canvas.selection = false;
    canvas.skipTargetFind = true;
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    let draftLine: fabric.Line | null = null;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    const getCanvasPointFromFabricEvent = (event: fabric.IEvent<MouseEvent>) => {
      // Use viewport-aware pointer so line/arrow drawing stays aligned when the canvas is zoomed/panned.
      const pointer = canvas.getPointer(event.e);
      return { x: pointer.x, y: pointer.y };
    };

    const getCanvasPointFromMouseEvent = (event: MouseEvent) => {
      const fallback = canvas.getPointer(event);
      return { x: fallback.x, y: fallback.y };
    };

    const buildArrowGroup = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      stroke: string,
      strokeWidth: number,
      selectable: boolean,
      evented: boolean,
    ) => {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = Math.max(12, strokeWidth * 4);
      const headAngle = Math.PI / 7;

      const leftX = x2 - headLength * Math.cos(angle - headAngle);
      const leftY = y2 - headLength * Math.sin(angle - headAngle);
      const rightX = x2 - headLength * Math.cos(angle + headAngle);
      const rightY = y2 - headLength * Math.sin(angle + headAngle);

      const mainLine = new fabric.Line([x1, y1, x2, y2], {
        stroke,
        strokeWidth,
        strokeLineCap: "round",
        selectable,
        evented,
      });

      const leftHead = new fabric.Line([x2, y2, leftX, leftY], {
        stroke,
        strokeWidth,
        strokeLineCap: "round",
        selectable,
        evented,
      });

      const rightHead = new fabric.Line([x2, y2, rightX, rightY], {
        stroke,
        strokeWidth,
        strokeLineCap: "round",
        selectable,
        evented,
      });

      return new fabric.Group([mainLine, leftHead, rightHead], {
        subTargetCheck: true,
        selectable,
        evented,
      });
    };

    const onMouseDown = (event: fabric.IEvent<MouseEvent>) => {
      if (event.e.button !== 0) return;
      isDragging = true;

      const pointer = getCanvasPointFromFabricEvent(event);
      startX = pointer.x;
      startY = pointer.y;
      lastX = pointer.x;
      lastY = pointer.y;

      const stroke = editorRef.current?.getActiveStrokeColor() || "rgba(0,0,0,1)";
      const strokeWidth = Math.max(editorRef.current?.getActiveStrokeWidth() || 2, 1);

      draftLine = new fabric.Line([startX, startY, startX, startY], {
        stroke,
        strokeWidth,
        strokeLineCap: "round",
        selectable: false,
        evented: false,
      });

      canvas.add(draftLine);

      canvas.requestRenderAll();
    };

    const onMouseMove = (event: fabric.IEvent<MouseEvent>) => {
      if (!isDragging) return;

      const pointer = getCanvasPointFromFabricEvent(event);
      let x2 = pointer.x;
      let y2 = pointer.y;

      if (event.e.shiftKey) {
        const deltaX = Math.abs(x2 - startX);
        const deltaY = Math.abs(y2 - startY);

        if (deltaX >= deltaY) {
          y2 = startY;
        } else {
          x2 = startX;
        }
      }

      lastX = x2;
      lastY = y2;

      if (draftLine) {
        draftLine.set({ x1: startX, y1: startY, x2, y2 });
      }

      canvas.requestRenderAll();
    };

    const finalizeLineOrArrow = (endXRaw: number, endYRaw: number, shiftKey: boolean) => {
      isDragging = false;

      let x2 = endXRaw;
      let y2 = endYRaw;

      if (shiftKey) {
        const deltaX = Math.abs(x2 - startX);
        const deltaY = Math.abs(y2 - startY);

        if (deltaX >= deltaY) {
          y2 = startY;
        } else {
          x2 = startX;
        }
      }

      const x1 = startX;
      const y1 = startY;
      const endX = x2;
      const endY = y2;

      const isZeroLength = Math.abs(endX - x1) < 1 && Math.abs(endY - y1) < 1;
      if (isZeroLength) {
        if (draftLine) {
          canvas.remove(draftLine);
        }
        draftLine = null;
        canvas.requestRenderAll();
        return;
      }

      if (lineMode === "arrow") {
        if (draftLine) {
          canvas.remove(draftLine);
        }

        const stroke = editorRef.current?.getActiveStrokeColor() || "rgba(0,0,0,1)";
        const strokeWidth = Math.max(editorRef.current?.getActiveStrokeWidth() || 2, 1);
        const arrow = buildArrowGroup(x1, y1, endX, endY, stroke, strokeWidth, true, true);
        canvas.add(arrow);
        canvas.setActiveObject(arrow);
        canvas.fire("object:modified", { target: arrow });
      } else if (draftLine) {
        draftLine.set({ x1, y1, x2: endX, y2: endY, selectable: true, evented: true });
        draftLine.setCoords();
        canvas.setActiveObject(draftLine);
        canvas.fire("object:modified", { target: draftLine });
      }

      draftLine = null;

      canvas.requestRenderAll();
    };

    const onMouseUp = (event: fabric.IEvent<MouseEvent>) => {
      if (!isDragging) return;

      finalizeLineOrArrow(lastX, lastY, Boolean(event.e.shiftKey));
    };

    const onWindowMouseUp = (event: MouseEvent) => {
      if (!isDragging) return;

      const pointer = getCanvasPointFromMouseEvent(event);
      const endX = Number.isFinite(pointer.x) ? pointer.x : lastX;
      const endY = Number.isFinite(pointer.y) ? pointer.y : lastY;

      // Prefer the latest preview point so the committed stroke matches what the user saw.
      finalizeLineOrArrow(lastX ?? endX, lastY ?? endY, Boolean(event.shiftKey));
    };

    canvas.on("mouse:down", onMouseDown as any);
    canvas.on("mouse:move", onMouseMove as any);
    canvas.on("mouse:up", onMouseUp as any);
    window.addEventListener("mouseup", onWindowMouseUp);

    return () => {
      canvas.off("mouse:down", onMouseDown as any);
      canvas.off("mouse:move", onMouseMove as any);
      canvas.off("mouse:up", onMouseUp as any);
      window.removeEventListener("mouseup", onWindowMouseUp);

      if (draftLine) {
        canvas.remove(draftLine);
      }
      draftLine = null;

      canvas.defaultCursor = previousDefaultCursor;
      canvas.selection = previousSelection;
      canvas.skipTargetFind = previousSkipTargetFind;
      canvas.requestRenderAll();
    };
  }, [activeTool, fabricCanvas, isPresenting, lineMode]);

  const captureCurrentSlide = useCallback((baseSlides: EditorSlide[]) => {
    if (!editor?.canvas) {
      return baseSlides;
    }

    try {
      const currentIndex = activeSlideIndexRef.current;
      const currentSlide = baseSlides[currentIndex];

      if (!currentSlide) return baseSlides;

      const snapshot = getCanvasSnapshot(editor.canvas);
      const nextSlides = baseSlides.map((slide, index) => {
        if (index !== currentIndex) return slide;

        return {
          ...slide,
          json: snapshot.json,
          width: snapshot.width || slide.width,
          height: snapshot.height || slide.height,
          thumbnailUrl: snapshot.thumbnailUrl ?? slide.thumbnailUrl,
        };
      });

      return nextSlides;
    } catch {
      return baseSlides;
    }
  }, [editor]);

  const onSelectSlide = useCallback((index: number) => {
    if (!editor) return;
    if (index === activeSlideIndexRef.current) return;

    const withCurrentSaved = captureCurrentSlide(slidesRef.current);
    const targetSlide = withCurrentSaved[index];

    if (!targetSlide) return;

    slidesRef.current = withCurrentSaved;
    setSlides(withCurrentSaved);
    activeSlideIndexRef.current = index;
    setActiveSlideIndex(index);

    editor.loadJson(targetSlide.json);
    editor.changeSize({ width: targetSlide.width, height: targetSlide.height });
    debouncedPersist(withCurrentSaved, index);
  }, [captureCurrentSlide, debouncedPersist, editor]);

  const onPresentAdvance = useCallback(async () => {
    if (!isPresenting) return;

    const currentIndex = activeSlideIndexRef.current;
    const isLastSlide = currentIndex >= slidesRef.current.length - 1;

    if (isLastSlide) {
      if (document.fullscreenElement === containerRef.current) {
        await document.exitFullscreen();
      }
      return;
    }

    onSelectSlide(currentIndex + 1);
  }, [isPresenting, onSelectSlide]);

  const onAddSlide = useCallback(() => {
    if (!editor) return;

    const withCurrentSaved = captureCurrentSlide(slidesRef.current);
    const currentSlide = withCurrentSaved[activeSlideIndexRef.current] ?? withCurrentSaved[0];

    const width = currentSlide?.width || initialData.width;
    const height = currentSlide?.height || initialData.height;

    const newSlide: EditorSlide = {
      id: createSlideId(),
      json: createBlankSlideJson(width, height),
      width,
      height,
    };

    const nextSlides = [...withCurrentSaved, newSlide];
    const nextIndex = nextSlides.length - 1;

    slidesRef.current = nextSlides;
    setSlides(nextSlides);
    activeSlideIndexRef.current = nextIndex;
    setActiveSlideIndex(nextIndex);

    editor.loadJson(newSlide.json);
    editor.changeSize({ width, height });
    debouncedPersist(nextSlides, nextIndex);
  }, [captureCurrentSlide, debouncedPersist, editor, initialData.height, initialData.width]);

  const onDuplicateSlide = useCallback((index: number) => {
    if (!editor) return;

    const withCurrentSaved = captureCurrentSlide(slidesRef.current);
    const sourceSlide = withCurrentSaved[index];
    if (!sourceSlide) return;

    const duplicated = cloneSlide(sourceSlide);
    const nextSlides = [
      ...withCurrentSaved.slice(0, index + 1),
      duplicated,
      ...withCurrentSaved.slice(index + 1),
    ];
    const nextIndex = index + 1;

    slidesRef.current = nextSlides;
    setSlides(nextSlides);
    activeSlideIndexRef.current = nextIndex;
    setActiveSlideIndex(nextIndex);

    editor.loadJson(duplicated.json);
    editor.changeSize({ width: duplicated.width, height: duplicated.height });
    debouncedPersist(nextSlides, nextIndex);
  }, [captureCurrentSlide, debouncedPersist, editor]);

  const onDeleteSlide = useCallback((index: number) => {
    if (!editor) return;

    const withCurrentSaved = captureCurrentSlide(slidesRef.current);
    if (withCurrentSaved.length <= 1) return;

    const nextSlides = withCurrentSaved.filter((_, slideIndex) => slideIndex !== index);
    const currentIndex = activeSlideIndexRef.current;
    const nextIndex = currentIndex > index
      ? currentIndex - 1
      : Math.min(currentIndex, nextSlides.length - 1);
    const targetSlide = nextSlides[nextIndex];

    if (!targetSlide) return;

    slidesRef.current = nextSlides;
    setSlides(nextSlides);
    activeSlideIndexRef.current = nextIndex;
    setActiveSlideIndex(nextIndex);

    editor.loadJson(targetSlide.json);
    editor.changeSize({ width: targetSlide.width, height: targetSlide.height });
    debouncedPersist(nextSlides, nextIndex);
  }, [captureCurrentSlide, debouncedPersist, editor]);

  const onReorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    if (!editor) return;
    if (fromIndex === toIndex) return;

    const withCurrentSaved = captureCurrentSlide(slidesRef.current);

    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= withCurrentSaved.length ||
      toIndex >= withCurrentSaved.length
    ) {
      return;
    }

    const nextSlides = [...withCurrentSaved];
    const [movedSlide] = nextSlides.splice(fromIndex, 1);
    if (!movedSlide) return;
    nextSlides.splice(toIndex, 0, movedSlide);

    const currentSlideId = withCurrentSaved[activeSlideIndexRef.current]?.id;
    const nextIndex = Math.max(0, nextSlides.findIndex((slide) => slide.id === currentSlideId));
    const targetSlide = nextSlides[nextIndex] ?? nextSlides[0];
    if (!targetSlide) return;

    slidesRef.current = nextSlides;
    setSlides(nextSlides);
    activeSlideIndexRef.current = nextIndex;
    setActiveSlideIndex(nextIndex);

    editor.loadJson(targetSlide.json);
    editor.changeSize({ width: targetSlide.width, height: targetSlide.height });
    debouncedPersist(nextSlides, nextIndex);
  }, [captureCurrentSlide, debouncedPersist, editor]);

  const onManualSave = useCallback(() => {
    const withCurrentSaved = captureCurrentSlide(slidesRef.current);
    const currentIndex = activeSlideIndexRef.current;

    slidesRef.current = withCurrentSaved;
    setSlides(withCurrentSaved);

    debouncedPersist.cancel();
    persistProject(withCurrentSaved, currentIndex);
  }, [captureCurrentSlide, debouncedPersist, persistProject]);

  const onApplyGeneratedSlides = useCallback((generatedSlides: { id: string; title: string; json: string; width: number; height: number }[]) => {
    if (!editor || generatedSlides.length === 0) return;

    const withCurrentSaved = captureCurrentSlide(slidesRef.current);

    const newSlides = generatedSlides.map((gs) => ({
      id: createSlideId(),
      json: gs.json,
      width: gs.width,
      height: gs.height,
    }));

    const nextSlides = [...withCurrentSaved, ...newSlides];
    const nextIndex = withCurrentSaved.length; // Go to first new slide

    slidesRef.current = nextSlides;
    setSlides(nextSlides);
    activeSlideIndexRef.current = nextIndex;
    setActiveSlideIndex(nextIndex);

    const firstNew = newSlides[0];
    if (firstNew) {
      editor.loadJson(firstNew.json);
      editor.changeSize({ width: firstNew.width, height: firstNew.height });
    }

    debouncedPersist(nextSlides, nextIndex);
  }, [captureCurrentSlide, debouncedPersist, editor]);

  const activeSlide = slides[activeSlideIndex] ?? slides[0];
  const contextObject = editor?.canvas.getActiveObject() as fabric.Object | undefined;
  const contextObjectIsText = Boolean(contextObject && isTextType(contextObject.type));
  const contextLayerLocked = Boolean(
    (contextObject as any)?.lockMovementX &&
    (contextObject as any)?.lockMovementY &&
    (contextObject as any)?.lockRotation &&
    (contextObject as any)?.lockScalingX &&
    (contextObject as any)?.lockScalingY,
  );

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      controlsAboveOverlay: true,
      preserveObjectStacking: true,
      fireRightClick: true as any,
      stopContextMenu: true as any,
    });

    init({
      initialCanvas: canvas,
      initialContainer: containerRef.current!,
    });

    return () => {
      canvas.dispose();
    };
  }, [init]);

  return (
    <div className="h-full flex flex-col">
      <Navbar
        id={initialData.id}
        projectName={projectName}
        projectWidth={activeSlide?.width ?? initialData.width}
        projectHeight={activeSlide?.height ?? initialData.height}
        projectThumbnailUrl={activeSlide?.thumbnailUrl ?? initialData.thumbnailUrl}
        slideContainerRef={containerRef}
        editor={editor}
        activeTool={activeTool}
        onChangeActiveTool={onChangeActiveTool}
        onManualSave={onManualSave}
        onPresentSlide={onPresentSlide}
        onProjectRenamed={setProjectName}
      />
      <div className="absolute h-[calc(100%-68px)] w-full top-[68px] flex">
        <Sidebar
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <FolderSidebar
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <ToolsSidebar
          editor={editor}
          activeTool={activeTool}
          lineMode={lineMode}
          onChangeActiveTool={onChangeActiveTool}
          onChangeLineMode={setLineMode}
        />
        <ShapeSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <FillColorSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <StrokeColorSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <StrokeWidthSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <OpacitySidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <TextSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <FontSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <ImageSidebar
          projectId={initialData.id}
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <TemplateSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <FilterSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <AiSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <RemoveBgSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <DrawSidebar
          editor={editor}
          activeTool={activeTool}
          lineMode={lineMode}
          onChangeLineMode={setLineMode}
          onChangeActiveTool={onChangeActiveTool}
        />
        <SettingsSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <GenerateSlidesSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
          onApplyGeneratedSlides={onApplyGeneratedSlides}
        />
        <main className="bg-muted flex-1 overflow-auto relative flex flex-col">
          <Toolbar
            editor={editor}
            activeTool={activeTool}
            onChangeActiveTool={onChangeActiveTool}
          />
          <div className="editor-slide-stage flex-1 bg-muted" ref={containerRef}>
            <canvas ref={canvasRef} />
            {isPresenting && (
              <button
                type="button"
                className="absolute inset-0 z-10 cursor-pointer bg-transparent"
                onClick={onPresentAdvance}
                aria-label="Next slide"
              />
            )}
          </div>

          {contextMenu && (
            <div
              className="fixed z-[120]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.preventDefault()}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <div className="relative min-w-[204px] rounded-lg border bg-white p-1 shadow-xl">
                <button
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    editor?.onCopy();
                    closeContextMenu();
                  }}
                >
                  <Copy className="size-3.5" />
                  <span>Copy</span>
                </button>
                <button
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    onCopyStyleForNext();
                    closeContextMenu();
                  }}
                >
                  <PaintRoller className="size-3.5" />
                  <span>Copy style</span>
                </button>
                <button
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    editor?.onPaste();
                    closeContextMenu();
                  }}
                >
                  <ClipboardPaste className="size-3.5" />
                  <span>Paste</span>
                </button>
                <button
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    onDuplicateObject();
                    closeContextMenu();
                  }}
                >
                  <CopyPlus className="size-3.5" />
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs text-destructive hover:bg-muted"
                  onClick={() => {
                    editor?.delete();
                    closeContextMenu();
                  }}
                >
                  <Trash className="size-3.5" />
                  <span>Delete</span>
                </button>

                <div className="my-1 h-px bg-border" />

                <button
                  type="button"
                  className="flex h-8 w-full items-center justify-between rounded px-2 text-left text-xs hover:bg-muted"
                  onMouseEnter={() => setActiveSubmenu("layer")}
                >
                  <span className="flex items-center gap-2">
                    <SquareSplitHorizontal className="size-3.5" />
                    Layer
                  </span>
                  <ChevronRight className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-full items-center justify-between rounded px-2 text-left text-xs hover:bg-muted"
                  onMouseEnter={() => setActiveSubmenu("align")}
                >
                  <span className="flex items-center gap-2">
                    <AlignCenter className="size-3.5" />
                    Align to page
                  </span>
                  <ChevronRight className="size-3.5" />
                </button>

                {contextObjectIsText && (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <div className="px-2 pb-1 pt-0.5 text-[10px] font-medium text-muted-foreground">Translate text</div>
                    <div className="grid grid-cols-2 gap-1 px-1 pb-1">
                      {TRANSLATE_LANGUAGES.map((language) => (
                        <button
                          key={language.code}
                          type="button"
                          disabled={isTranslatingText}
                          className="flex h-7 items-center justify-center gap-1 rounded px-1.5 text-[10px] hover:bg-muted disabled:opacity-50"
                          onClick={async () => {
                            await onTranslateText(language.code);
                            closeContextMenu();
                          }}
                        >
                          <Languages className="size-3" />
                          {language.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {activeSubmenu === "layer" && (
                  <div
                    className="absolute left-full top-[190px] ml-1 min-w-[180px] rounded-lg border bg-white p-1 shadow-xl"
                    onMouseEnter={() => setActiveSubmenu("layer")}
                  >
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onLayerOrder("bring-forward"); closeContextMenu(); }}>
                      <ArrowUp className="size-3.5" />
                      Bring forward
                    </button>
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onLayerOrder("bring-front"); closeContextMenu(); }}>
                      <ChevronsUp className="size-3.5" />
                      Bring to front
                    </button>
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onLayerOrder("send-backward"); closeContextMenu(); }}>
                      <ArrowDown className="size-3.5" />
                      Send backward
                    </button>
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onLayerOrder("send-back"); closeContextMenu(); }}>
                      <ChevronsDown className="size-3.5" />
                      Send to back
                    </button>
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onToggleLayerLock(); closeContextMenu(); }}>
                      {contextLayerLocked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
                      {contextLayerLocked ? "Unlock layer" : "Lock layer"}
                    </button>
                  </div>
                )}

                {activeSubmenu === "align" && (
                  <div
                    className="absolute left-full top-[222px] ml-1 min-w-[180px] rounded-lg border bg-white p-1 shadow-xl"
                    onMouseEnter={() => setActiveSubmenu("align")}
                  >
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onAlignToPage("left"); closeContextMenu(); }}>
                      <AlignLeft className="size-3.5" />
                      Left
                    </button>
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onAlignToPage("center"); closeContextMenu(); }}>
                      <AlignCenter className="size-3.5" />
                      Center
                    </button>
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onAlignToPage("right"); closeContextMenu(); }}>
                      <AlignRight className="size-3.5" />
                      Right
                    </button>
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onAlignToPage("top"); closeContextMenu(); }}>
                      <ArrowUp className="size-3.5" />
                      Top
                    </button>
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onAlignToPage("middle"); closeContextMenu(); }}>
                      <SquareSplitHorizontal className="size-3.5" />
                      Middle
                    </button>
                    <button type="button" className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted" onClick={() => { onAlignToPage("bottom"); closeContextMenu(); }}>
                      <ArrowDown className="size-3.5" />
                      Bottom
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <Footer
            editor={editor}
            slides={slides}
            activeSlideIndex={activeSlideIndex}
            onSelectSlide={onSelectSlide}
            onAddSlide={onAddSlide}
            onDuplicateSlide={onDuplicateSlide}
            onDeleteSlide={onDeleteSlide}
            onReorderSlides={onReorderSlides}
          />
        </main>
        <ChatSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
      </div>
    </div>
  );
};
