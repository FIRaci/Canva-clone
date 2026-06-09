import { fabric } from "fabric";
import { useEffect, useRef, useState } from "react";

import {
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaUnderline,
} from "react-icons/fa";
import { TbColorFilter } from "react-icons/tb";
import { BsBorderWidth } from "react-icons/bs";
import { RxTransparencyGrid } from "react-icons/rx";
import {
  AlignJustify,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Crop,
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  ChevronDown,
  FlipHorizontal,
  FlipVertical,
  List,
  Lock,
  PaintRoller,
  SquareSplitHorizontal,
  Unlock,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { isTextType } from "@/features/editor/utils";
import { FontSizeInput } from "@/features/editor/components/font-size-input";
import {
  ActiveTool,
  Editor,
  FONT_SIZE,
  FONT_WEIGHT,
} from "@/features/editor/types";

import { cn } from "@/lib/utils";
import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const Toolbar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: ToolbarProps) => {
  const fabricCanvas = editor?.canvas;
  const [isCropMode, setIsCropMode] = useState(false);
  const cropStateRef = useRef<{
    target: fabric.Object;
    cropRect: fabric.Rect | null;
    maskRects: fabric.Rect[];
    previousSelection: boolean;
    previousSkipTargetFind: boolean;
    previousDefaultCursor: string;
    previousImageSelectable: boolean;
    previousImageEvented: boolean;
    previousImageHasControls: boolean;
  } | null>(null);

  const initialFillColor = editor?.getActiveFillColor();
  const initialStrokeColor = editor?.getActiveStrokeColor();
  const initialFontFamily = editor?.getActiveFontFamily();
  const initialFontWeight = editor?.getActiveFontWeight() || FONT_WEIGHT;
  const initialFontStyle = editor?.getActiveFontStyle();
  const initialFontLinethrough = editor?.getActiveFontLinethrough();
  const initialFontUnderline = editor?.getActiveFontUnderline();
  const initialTextAlign = editor?.getActiveTextAlign();
  const initialFontSize = editor?.getActiveFontSize() || FONT_SIZE;

  const [properties, setProperties] = useState({
    fillColor: initialFillColor,
    strokeColor: initialStrokeColor,
    fontFamily: initialFontFamily,
    fontWeight: initialFontWeight,
    fontStyle: initialFontStyle,
    fontLinethrough: initialFontLinethrough,
    fontUnderline: initialFontUnderline,
    textAlign: initialTextAlign,
    fontSize: initialFontSize,
  });

  const selectedObject = editor?.selectedObjects[0];
  const selectedObjectType = editor?.selectedObjects[0]?.type;

  const isText = isTextType(selectedObjectType);
  const isImage = selectedObjectType === "image";
  const canUseCrop = Boolean((selectedObject && !isText) || isCropMode);

  useEffect(() => {
    setProperties({
      fillColor: editor?.getActiveFillColor(),
      strokeColor: editor?.getActiveStrokeColor(),
      fontFamily: editor?.getActiveFontFamily(),
      fontWeight: editor?.getActiveFontWeight() || FONT_WEIGHT,
      fontStyle: editor?.getActiveFontStyle(),
      fontLinethrough: editor?.getActiveFontLinethrough(),
      fontUnderline: editor?.getActiveFontUnderline(),
      textAlign: editor?.getActiveTextAlign(),
      fontSize: editor?.getActiveFontSize() || FONT_SIZE,
    });
  }, [editor, selectedObject]);

  const onChangeFontSize = (value: number) => {
    if (!selectedObject) return;

    editor?.changeFontSize(value);
    setProperties((current) => ({
      ...current,
      fontSize: value,
    }));
  };

  const onChangeTextAlign = (value: string) => {
    if (!selectedObject) return;

    editor?.changeTextAlign(value);
    setProperties((current) => ({
      ...current,
      textAlign: value,
    }));
  };

  const toggleBold = () => {
    if (!selectedObject) return;

    const newValue = properties.fontWeight > 500 ? 500 : 700;

    editor?.changeFontWeight(newValue);
    setProperties((current) => ({
      ...current,
      fontWeight: newValue,
    }));
  };

  const toggleItalic = () => {
    if (!selectedObject) return;

    const isItalic = properties.fontStyle === "italic";
    const newValue = isItalic ? "normal" : "italic";

    editor?.changeFontStyle(newValue);
    setProperties((current) => ({
      ...current,
      fontStyle: newValue,
    }));
  };

  const toggleUnderline = () => {
    if (!selectedObject) return;

    const newValue = properties.fontUnderline ? false : true;

    editor?.changeFontUnderline(newValue);
    setProperties((current) => ({
      ...current,
      fontUnderline: newValue,
    }));
  };

  const toggleLinethrough = () => {
    if (!selectedObject) return;

    const newValue = properties.fontLinethrough ? false : true;

    editor?.changeFontLinethrough(newValue);
    setProperties((current) => ({
      ...current,
      fontLinethrough: newValue,
    }));
  };

  const alignCycle = ["left", "center", "right", "justify"] as const;
  const resolvedAlign = alignCycle.includes((properties.textAlign as any) ?? "left")
    ? (properties.textAlign as (typeof alignCycle)[number])
    : "left";

  const alignIcon = resolvedAlign === "left"
    ? AlignLeft
    : resolvedAlign === "center"
      ? AlignCenter
      : resolvedAlign === "right"
        ? AlignRight
        : AlignJustify;

  const cycleTextAlign = () => {
    if (!selectedObject || !isText) return;

    const currentIndex = alignCycle.findIndex((value) => value === resolvedAlign);
    const nextAlign = alignCycle[(currentIndex + 1) % alignCycle.length];
    onChangeTextAlign(nextAlign);
  };

  const toggleListStyle = () => {
    if (!selectedObject || !isText) return;

    const currentText = (selectedObject as any).text;
    if (typeof currentText !== "string") return;

    const lines = currentText.split("\n");
    const hasOnlyListItems = lines.every((line) => /^\s*([\u2022\-*]|\d+[.)])\s+/.test(line) || line.trim() === "");

    const nextText = hasOnlyListItems
      ? lines.map((line) => line.replace(/^\s*([\u2022\-*]|\d+[.)])\s+/, "")).join("\n")
      : lines.map((line) => (line.trim() ? `• ${line}` : line)).join("\n");

    (selectedObject as any).set({ text: nextText });
    editor?.canvas.requestRenderAll();
    editor?.canvas.fire("object:modified", { target: selectedObject });
  };

  const isLayerLocked = Boolean(
    selectedObject?.lockMovementX &&
      selectedObject?.lockMovementY &&
      selectedObject?.lockRotation &&
      selectedObject?.lockScalingX &&
      selectedObject?.lockScalingY,
  );

  const markObjectChanged = () => {
    if (!selectedObject) return;
    editor?.canvas.requestRenderAll();
    editor?.canvas.fire("object:modified", { target: selectedObject });
  };

  const lockHistory = (canvas: fabric.Canvas) => {
    (canvas as any).__historyLockCount = Number((canvas as any).__historyLockCount || 0) + 1;
  };

  const unlockHistory = (canvas: fabric.Canvas) => {
    const nextValue = Math.max(0, Number((canvas as any).__historyLockCount || 0) - 1);
    (canvas as any).__historyLockCount = nextValue;
  };

  const cancelCropMode = (options?: { commitTarget?: fabric.Object }) => {
    if (!fabricCanvas) {
      setIsCropMode(false);
      return;
    }

    const canvas = fabricCanvas;
    const state = cropStateRef.current;

    if (state?.cropRect) {
      canvas.remove(state.cropRect);
    }

    if (state?.maskRects?.length) {
      state.maskRects.forEach((maskRect) => canvas.remove(maskRect));
    }

    if (state) {
      state.target.set({
        selectable: state.previousImageSelectable,
        evented: state.previousImageEvented,
        hasControls: state.previousImageHasControls,
      });
      state.target.setCoords();

      canvas.selection = state.previousSelection;
      canvas.skipTargetFind = state.previousSkipTargetFind;
      canvas.defaultCursor = state.previousDefaultCursor;
      canvas.setActiveObject(state.target);
    }

    cropStateRef.current = null;
    setIsCropMode(false);
    unlockHistory(canvas);

    if (options?.commitTarget) {
      canvas.fire("object:modified", { target: options.commitTarget });
    }

    canvas.requestRenderAll();
  };

  const applyCrop = () => {
    if (!fabricCanvas) return;

    const canvas = fabricCanvas;
    const state = cropStateRef.current;
    if (!state?.cropRect) return;

    const cropLeft = Number(state.cropRect.left) || 0;
    const cropTop = Number(state.cropRect.top) || 0;
    const cropWidthOnCanvas = (Number(state.cropRect.width) || 0) * (Number(state.cropRect.scaleX) || 1);
    const cropHeightOnCanvas = (Number(state.cropRect.height) || 0) * (Number(state.cropRect.scaleY) || 1);
    const right = cropLeft + cropWidthOnCanvas;
    const bottom = cropTop + cropHeightOnCanvas;

    const corners = [
      new fabric.Point(cropLeft, cropTop),
      new fabric.Point(right, cropTop),
      new fabric.Point(right, bottom),
      new fabric.Point(cropLeft, bottom),
    ];

    const localCorners = corners.map((corner) =>
      state.target.toLocalPoint(corner, "center", "center"),
    );

    const currentWidth = Number(state.target.width) || 0;
    const currentHeight = Number(state.target.height) || 0;
    if (currentWidth <= 0 || currentHeight <= 0) {
      toast.error("Cannot crop this object");
      cancelCropMode();
      return;
    }

    const halfWidth = currentWidth / 2;
    const halfHeight = currentHeight / 2;

    const minLocalX = Math.max(-halfWidth, Math.min(...localCorners.map((point) => point.x)));
    const maxLocalX = Math.min(halfWidth, Math.max(...localCorners.map((point) => point.x)));
    const minLocalY = Math.max(-halfHeight, Math.min(...localCorners.map((point) => point.y)));
    const maxLocalY = Math.min(halfHeight, Math.max(...localCorners.map((point) => point.y)));

    const cropWidth = maxLocalX - minLocalX;
    const cropHeight = maxLocalY - minLocalY;

    if (cropWidth < 4 || cropHeight < 4) {
      toast.info("Selected crop area is too small");
      return;
    }

    if (state.target.type === "image") {
      const imageTarget = state.target as fabric.Image;
      const currentCropX = Number((imageTarget as any).cropX) || 0;
      const currentCropY = Number((imageTarget as any).cropY) || 0;

      imageTarget.set({
        cropX: currentCropX + (minLocalX + halfWidth),
        cropY: currentCropY + (minLocalY + halfHeight),
        width: cropWidth,
        height: cropHeight,
      });
    } else {
      state.target.clipPath = new fabric.Rect({
        originX: "center",
        originY: "center",
        left: (minLocalX + maxLocalX) / 2,
        top: (minLocalY + maxLocalY) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    }

    state.target.setPositionByOrigin(
      new fabric.Point(
        cropLeft + cropWidthOnCanvas / 2,
        cropTop + cropHeightOnCanvas / 2,
      ),
      "center",
      "center",
    );
    state.target.setCoords();

    cancelCropMode({ commitTarget: state.target });
  };

  const bringForward = () => {
    if (!selectedObject) return;
    (selectedObject as any).bringForward?.();
    markObjectChanged();
  };

  const bringToFront = () => {
    if (!selectedObject) return;
    (selectedObject as any).bringToFront?.();
    markObjectChanged();
  };

  const sendBackward = () => {
    if (!selectedObject) return;
    (selectedObject as any).sendBackwards?.();
    markObjectChanged();
  };

  const sendToBack = () => {
    if (!selectedObject) return;
    (selectedObject as any).sendToBack?.();
    markObjectChanged();
  };

  const alignObjectHorizontal = (position: "left" | "center" | "right") => {
    if (!selectedObject) return;

    const workspace = editor?.getWorkspace();
    if (!workspace) return;

    const workspaceBounds = workspace.getBoundingRect(true, true);
    const objectBounds = selectedObject.getBoundingRect(true, true);
    const currentCenter = selectedObject.getCenterPoint();

    let nextX = currentCenter.x;

    if (position === "left") {
      nextX = workspaceBounds.left + objectBounds.width / 2;
    } else if (position === "center") {
      nextX = workspaceBounds.left + workspaceBounds.width / 2;
    } else {
      nextX = workspaceBounds.left + workspaceBounds.width - objectBounds.width / 2;
    }

    selectedObject.setPositionByOrigin(
      new fabric.Point(nextX, currentCenter.y),
      "center",
      "center",
    );
    markObjectChanged();
  };

  const alignObjectVertical = (position: "top" | "middle" | "bottom") => {
    if (!selectedObject) return;

    const workspace = editor?.getWorkspace();
    if (!workspace) return;

    const workspaceBounds = workspace.getBoundingRect(true, true);
    const objectBounds = selectedObject.getBoundingRect(true, true);
    const currentCenter = selectedObject.getCenterPoint();

    let nextY = currentCenter.y;

    if (position === "top") {
      nextY = workspaceBounds.top + objectBounds.height / 2;
    } else if (position === "middle") {
      nextY = workspaceBounds.top + workspaceBounds.height / 2;
    } else {
      nextY = workspaceBounds.top + workspaceBounds.height - objectBounds.height / 2;
    }

    selectedObject.setPositionByOrigin(
      new fabric.Point(currentCenter.x, nextY),
      "center",
      "center",
    );
    markObjectChanged();
  };

  const renderPositionMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8">
          Position
          <ChevronDown className="size-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[360px] p-0">
        <div className="grid grid-cols-2">
          <div className="p-1">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Layer</p>
            <DropdownMenuItem onClick={bringForward}>
              <ArrowUp className="size-4 mr-2" />
              Bring forward
            </DropdownMenuItem>
            <DropdownMenuItem onClick={bringToFront}>
              <ChevronsUp className="size-4 mr-2" />
              Bring to front
            </DropdownMenuItem>
            <DropdownMenuItem onClick={sendBackward}>
              <ArrowDown className="size-4 mr-2" />
              Send backward
            </DropdownMenuItem>
            <DropdownMenuItem onClick={sendToBack}>
              <ChevronsDown className="size-4 mr-2" />
              Send to back
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleLayerLock}>
              {isLayerLocked ? (
                <Unlock className="size-4 mr-2" />
              ) : (
                <Lock className="size-4 mr-2" />
              )}
              {isLayerLocked ? "Unlock layer" : "Lock layer"}
            </DropdownMenuItem>
          </div>
          <div className="border-l p-1">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Align To Frame</p>
            <DropdownMenuItem onClick={() => alignObjectHorizontal("left")}>
              <AlignLeft className="size-4 mr-2" />
              Left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alignObjectHorizontal("center")}>
              <AlignCenter className="size-4 mr-2" />
              Center
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alignObjectHorizontal("right")}>
              <AlignRight className="size-4 mr-2" />
              Right
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alignObjectVertical("top")}>
              <ArrowUp className="size-4 mr-2" />
              Top
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alignObjectVertical("middle")}>
              <SquareSplitHorizontal className="size-4 mr-2" />
              Middle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alignObjectVertical("bottom")}>
              <ArrowDown className="size-4 mr-2" />
              Bottom
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const toggleLayerLock = () => {
    if (!selectedObject) return;

    const nextLocked = !isLayerLocked;

    selectedObject.set({
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

    if (isText) {
      (selectedObject as any).set({ editable: !nextLocked });
    }

    selectedObject.setCoords();
    editor?.canvas.setActiveObject(selectedObject);
    markObjectChanged();
  };

  const copyTextStyleForNext = () => {
    if (!selectedObject || !isText) return;

    const textStyleTemplate = {
      fontFamily: (selectedObject as any).fontFamily,
      fontSize: (selectedObject as any).fontSize,
      fontWeight: (selectedObject as any).fontWeight,
      fontStyle: (selectedObject as any).fontStyle,
      underline: (selectedObject as any).underline,
      linethrough: (selectedObject as any).linethrough,
      fill: (selectedObject as any).fill,
      textAlign: (selectedObject as any).textAlign,
      charSpacing: (selectedObject as any).charSpacing,
      lineHeight: (selectedObject as any).lineHeight,
    };

    (editor?.canvas as any).__textStyleTemplate = textStyleTemplate;
    toast.success("Text style copied for next textboxes");
  };

  const cropImage = () => {
    if (!fabricCanvas || !selectedObject || isText) {
      toast.info("Crop is available for selected object");
      return;
    }

    if (isCropMode) {
      cancelCropMode();
      return;
    }

    const canvas = fabricCanvas;
    const target = selectedObject as fabric.Object;

    cropStateRef.current = {
      target,
      cropRect: null,
      maskRects: [],
      previousSelection: Boolean(canvas.selection),
      previousSkipTargetFind: Boolean(canvas.skipTargetFind),
      previousDefaultCursor: canvas.defaultCursor || "default",
      previousImageSelectable: Boolean(target.selectable),
      previousImageEvented: Boolean(target.evented),
      previousImageHasControls: Boolean(target.hasControls),
    };

    canvas.selection = false;
    canvas.skipTargetFind = false;
    canvas.defaultCursor = "crosshair";
    lockHistory(canvas);
    target.set({
      selectable: false,
      evented: false,
      hasControls: false,
    });
    target.setCoords();
    setIsCropMode(true);
    canvas.requestRenderAll();
    toast.info("Resize or move the crop box, then press Confirm to crop.");
  };

  useEffect(() => {
    if (!fabricCanvas) return;
    if (!isCropMode) return;

    const canvas = fabricCanvas;
    const state = cropStateRef.current;
    if (!state) return;

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const imageBounds = state.target.getBoundingRect(true, true);
    const insetX = Math.max(12, imageBounds.width * 0.08);
    const insetY = Math.max(12, imageBounds.height * 0.08);

    const cropRect = new fabric.Rect({
      left: imageBounds.left + insetX,
      top: imageBounds.top + insetY,
      width: Math.max(24, imageBounds.width - insetX * 2),
      height: Math.max(24, imageBounds.height - insetY * 2),
      fill: "rgba(255,255,255,0.01)",
      stroke: "#3b82f6",
      strokeWidth: 2,
      strokeUniform: true,
      strokeDashArray: [8, 4],
      hasRotatingPoint: false,
      lockRotation: true,
      cornerColor: "#3b82f6",
      cornerStrokeColor: "#ffffff",
      borderColor: "#3b82f6",
      transparentCorners: false,
      selectable: true,
      evented: true,
      __transientCropUi: true,
    } as any);

    const createMaskRect = () =>
      new fabric.Rect({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        fill: "rgba(0,0,0,0.45)",
        selectable: false,
        evented: false,
        __transientCropUi: true,
      } as any);

    const topMask = createMaskRect();
    const rightMask = createMaskRect();
    const bottomMask = createMaskRect();
    const leftMask = createMaskRect();
    const maskRects = [topMask, rightMask, bottomMask, leftMask];

    const normalizeAndClampCropRect = () => {
      const minSize = 12;
      const targetBounds = state.target.getBoundingRect(true, true);

      const scaledWidth = Math.max(minSize, (Number(cropRect.width) || 0) * (Number(cropRect.scaleX) || 1));
      const scaledHeight = Math.max(minSize, (Number(cropRect.height) || 0) * (Number(cropRect.scaleY) || 1));

      const clampedWidth = Math.min(scaledWidth, Math.max(minSize, targetBounds.width));
      const clampedHeight = Math.min(scaledHeight, Math.max(minSize, targetBounds.height));

      let nextLeft = Number(cropRect.left) || targetBounds.left;
      let nextTop = Number(cropRect.top) || targetBounds.top;

      const maxLeft = targetBounds.left + targetBounds.width - clampedWidth;
      const maxTop = targetBounds.top + targetBounds.height - clampedHeight;

      nextLeft = Math.max(targetBounds.left, Math.min(nextLeft, maxLeft));
      nextTop = Math.max(targetBounds.top, Math.min(nextTop, maxTop));

      cropRect.set({
        left: nextLeft,
        top: nextTop,
        width: clampedWidth,
        height: clampedHeight,
        scaleX: 1,
        scaleY: 1,
      });
      cropRect.setCoords();
    };

    const updateMaskRects = () => {
      normalizeAndClampCropRect();

      const left = Math.max(0, Math.min(canvasWidth, Number(cropRect.left) || 0));
      const top = Math.max(0, Math.min(canvasHeight, Number(cropRect.top) || 0));
      const rectWidth = (Number(cropRect.width) || 0) * (Number(cropRect.scaleX) || 1);
      const rectHeight = (Number(cropRect.height) || 0) * (Number(cropRect.scaleY) || 1);
      const right = Math.max(0, Math.min(canvasWidth, left + rectWidth));
      const bottom = Math.max(0, Math.min(canvasHeight, top + rectHeight));

      topMask.set({ left: 0, top: 0, width: canvasWidth, height: top });
      rightMask.set({ left: right, top, width: Math.max(0, canvasWidth - right), height: Math.max(0, bottom - top) });
      bottomMask.set({ left: 0, top: bottom, width: canvasWidth, height: Math.max(0, canvasHeight - bottom) });
      leftMask.set({ left: 0, top, width: left, height: Math.max(0, bottom - top) });

      maskRects.forEach((maskRect) => maskRect.setCoords());
      canvas.requestRenderAll();
    };

    const syncCropMask = () => {
      updateMaskRects();
    };

    cropRect.on("moving", syncCropMask);
    cropRect.on("scaling", syncCropMask);
    cropRect.on("modified", syncCropMask);

    state.cropRect = cropRect;
    state.maskRects = maskRects;

    maskRects.forEach((maskRect) => canvas.add(maskRect));
    canvas.add(cropRect);
    canvas.setActiveObject(cropRect);
    updateMaskRects();

    return () => {
      cropRect.off("moving", syncCropMask);
      cropRect.off("scaling", syncCropMask);
      cropRect.off("modified", syncCropMask);

      const currentState = cropStateRef.current;
      if (currentState?.cropRect) {
        canvas.remove(currentState.cropRect);
      }
      if (currentState?.maskRects?.length) {
        currentState.maskRects.forEach((maskRect) => canvas.remove(maskRect));
      }

      if (currentState) {
        currentState.target.set({
          selectable: currentState.previousImageSelectable,
          evented: currentState.previousImageEvented,
          hasControls: currentState.previousImageHasControls,
        });
        currentState.target.setCoords();

        canvas.selection = currentState.previousSelection;
        canvas.skipTargetFind = currentState.previousSkipTargetFind;
        canvas.defaultCursor = currentState.previousDefaultCursor;
      }

      cropStateRef.current = null;
      unlockHistory(canvas);
      canvas.requestRenderAll();
    };
  }, [fabricCanvas, isCropMode]);

  const flipHorizontal = () => {
    if (!selectedObject) return;

    selectedObject.set({ scaleX: (selectedObject.scaleX ?? 1) * -1 });
    markObjectChanged();
  };

  const flipVertical = () => {
    if (!selectedObject) return;

    selectedObject.set({ scaleY: (selectedObject.scaleY ?? 1) * -1 });
    markObjectChanged();
  };

  const copyObjectStyleForNext = () => {
    if (!selectedObject) return;

    if (isText) {
      copyTextStyleForNext();
      return;
    }

    const fill = selectedObject.get("fill");
    const stroke = selectedObject.get("stroke");
    const strokeWidth = selectedObject.get("strokeWidth");
    const opacity = selectedObject.get("opacity");

    if (typeof fill === "string") {
      editor?.changeFillColor(fill);
    }

    if (typeof stroke === "string") {
      editor?.changeStrokeColor(stroke);
    }

    if (typeof strokeWidth === "number") {
      editor?.changeStrokeWidth(strokeWidth);
    }

    (editor?.canvas as any).__objectStyleTemplate = {
      fill,
      stroke,
      strokeWidth,
      opacity,
      strokeDashArray: selectedObject.get("strokeDashArray"),
    };

    toast.success("Style copied for next objects");
  };

  if (editor?.selectedObjects.length === 0 && !isCropMode) {
    return (
      <div className="shrink-0 h-[56px] border-b bg-white w-full flex items-center overflow-x-auto z-[49] p-2 gap-x-2" />
    );
  }

  return (
    <div className="shrink-0 h-[56px] border-b bg-white w-full flex items-center overflow-x-auto z-[49] p-2 gap-x-2">
      {!isImage && !isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Color" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("fill")}
              size="icon"
              variant="ghost"
              className={cn(activeTool === "fill" && "bg-gray-100")}
            >
              <div
                className="rounded-sm size-4 border"
                style={{ backgroundColor: properties.fillColor }}
              />
            </Button>
          </Hint>
        </div>
      )}

      {!isText && !isImage && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Stroke color" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("stroke-color")}
              size="icon"
              variant="ghost"
              className={cn(activeTool === "stroke-color" && "bg-gray-100")}
            >
              <div
                className="rounded-sm size-4 border-2 bg-white"
                style={{ borderColor: properties.strokeColor }}
              />
            </Button>
          </Hint>
        </div>
      )}

      {!isText && !isImage && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Stroke width" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("stroke-width")}
              size="icon"
              variant="ghost"
              className={cn(activeTool === "stroke-width" && "bg-gray-100")}
            >
              <BsBorderWidth className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {!isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label={isCropMode ? "Cancel crop" : "Crop"} side="bottom" sideOffset={5}>
            <Button
              onClick={cropImage}
              size="icon"
              variant="ghost"
              className={cn(isCropMode && "bg-gray-100")}
              disabled={!canUseCrop}
            >
              <Crop className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {isCropMode && (
        <div className="flex items-center h-full justify-center gap-1">
          <Hint label="Confirm crop" side="bottom" sideOffset={5}>
            <Button
              onClick={applyCrop}
              size="icon"
              variant="ghost"
            >
              <Check className="size-4" />
            </Button>
          </Hint>
          <Hint label="Cancel crop" side="bottom" sideOffset={5}>
            <Button
              onClick={() => cancelCropMode()}
              size="icon"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {!isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Flip horizontal" side="bottom" sideOffset={5}>
            <Button
              onClick={flipHorizontal}
              size="icon"
              variant="ghost"
            >
              <FlipHorizontal className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {!isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Flip vertical" side="bottom" sideOffset={5}>
            <Button
              onClick={flipVertical}
              size="icon"
              variant="ghost"
            >
              <FlipVertical className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {!isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Opacity" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("opacity")}
              size="icon"
              variant="ghost"
              className={cn(activeTool === "opacity" && "bg-gray-100")}
            >
              <RxTransparencyGrid className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {!isText && (
        <div className="flex items-center h-full justify-center">
          {renderPositionMenu()}
        </div>
      )}

      {!isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Copy style" side="bottom" sideOffset={5}>
            <Button
              onClick={copyObjectStyleForNext}
              size="icon"
              variant="ghost"
            >
              <PaintRoller className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Font" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("font")}
              size="icon"
              variant="ghost"
              className={cn(
                "w-auto px-2 text-sm",
                activeTool === "font" && "bg-gray-100",
              )}
            >
              <div className="max-w-[100px] truncate">{properties.fontFamily}</div>
              <ChevronDown className="size-4 ml-2 shrink-0" />
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <FontSizeInput value={properties.fontSize} onChange={onChangeFontSize} />
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Text color" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("fill")}
              size="icon"
              variant="ghost"
              className={cn(activeTool === "fill" && "bg-gray-100")}
            >
              <div
                className="rounded-sm size-4 border"
                style={{ backgroundColor: properties.fillColor }}
              />
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Bold" side="bottom" sideOffset={5}>
            <Button
              onClick={toggleBold}
              size="icon"
              variant="ghost"
              className={cn(properties.fontWeight > 500 && "bg-gray-100")}
            >
              <FaBold className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Italic" side="bottom" sideOffset={5}>
            <Button
              onClick={toggleItalic}
              size="icon"
              variant="ghost"
              className={cn(properties.fontStyle === "italic" && "bg-gray-100")}
            >
              <FaItalic className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Underline" side="bottom" sideOffset={5}>
            <Button
              onClick={toggleUnderline}
              size="icon"
              variant="ghost"
              className={cn(properties.fontUnderline && "bg-gray-100")}
            >
              <FaUnderline className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Strike" side="bottom" sideOffset={5}>
            <Button
              onClick={toggleLinethrough}
              size="icon"
              variant="ghost"
              className={cn(properties.fontLinethrough && "bg-gray-100")}
            >
              <FaStrikethrough className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label={`Align ${resolvedAlign}`} side="bottom" sideOffset={5}>
            <Button
              onClick={cycleTextAlign}
              size="icon"
              variant="ghost"
            >
              {(() => {
                const Icon = alignIcon;
                return <Icon className="size-4" />;
              })()}
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="List" side="bottom" sideOffset={5}>
            <Button
              onClick={toggleListStyle}
              size="icon"
              variant="ghost"
            >
              <List className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Opacity" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("opacity")}
              size="icon"
              variant="ghost"
              className={cn(activeTool === "opacity" && "bg-gray-100")}
            >
              <RxTransparencyGrid className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          {renderPositionMenu()}
        </div>
      )}

      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Copy style for next textboxes" side="bottom" sideOffset={5}>
            <Button
              onClick={copyTextStyleForNext}
              size="icon"
              variant="ghost"
            >
              <PaintRoller className="size-4" />
            </Button>
          </Hint>
        </div>
      )}

    </div>
  );
};
