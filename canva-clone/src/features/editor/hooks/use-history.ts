import { fabric } from "fabric";
import { useCallback, useRef, useState } from "react";

import { JSON_KEYS } from "@/features/editor/types";

interface UseHistoryProps {
  canvas: fabric.Canvas | null;
  saveCallback?: (values: {
    json: string;
    height: number;
    width: number;
    thumbnailUrl?: string;
  }) => void;
};

export const useHistory = ({ canvas, saveCallback }: UseHistoryProps) => {
  const [historyIndex, setHistoryIndex] = useState(0);
  const canvasHistory = useRef<string[]>([]);
  const skipSave = useRef(false);

  const normalizeTextObjects = useCallback(() => {
    if (!canvas) return;

    canvas.getObjects().forEach((object) => {
      if (object.type !== "text" && object.type !== "i-text" && object.type !== "textbox") {
        return;
      }

      const textObject = object as fabric.Textbox;
      if (typeof textObject.text !== "string") {
        textObject.set({ text: String((textObject as unknown as { text?: unknown }).text ?? "") });
      }

      if (!Array.isArray((textObject as unknown as { styles?: unknown }).styles)) {
        (textObject as unknown as { styles: unknown[] }).styles = [];
      }
    });
  }, [canvas]);

  const canUndo = useCallback(() => {
    return historyIndex > 0;
  }, [historyIndex]);

  const canRedo = useCallback(() => {
    return historyIndex < canvasHistory.current.length - 1;
  }, [historyIndex]);

  const save = useCallback((skip = false) => {
    if (!canvas) return;

    normalizeTextObjects();

    let currentState;

    try {
      currentState = canvas.toJSON(JSON_KEYS);
    } catch {
      normalizeTextObjects();
      currentState = canvas.toJSON();
    }

    const json = JSON.stringify(currentState);

    if (!skip && !skipSave.current) {
      canvasHistory.current.push(json);
      setHistoryIndex(canvasHistory.current.length - 1);
    }

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

    saveCallback?.({ json, height, width, thumbnailUrl });
  }, 
  [
    canvas,
    normalizeTextObjects,
    saveCallback,
  ]);

  const undo = useCallback(() => {
    if (canUndo()) {
      skipSave.current = true;
      canvas?.clear().renderAll();

      const previousIndex = historyIndex - 1;
      const previousState = JSON.parse(
        canvasHistory.current[previousIndex]
      );

      canvas?.loadFromJSON(previousState, () => {
        canvas.renderAll();
        setHistoryIndex(previousIndex);
        skipSave.current = false;
      });
    }
  }, [canUndo, canvas, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo()) {
      skipSave.current = true;
      canvas?.clear().renderAll();

      const nextIndex = historyIndex + 1;
      const nextState = JSON.parse(
        canvasHistory.current[nextIndex]
      );

      canvas?.loadFromJSON(nextState, () => {
        canvas.renderAll();
        setHistoryIndex(nextIndex);
        skipSave.current = false;
      });
    }
  }, [canvas, historyIndex, canRedo]);

  return { 
    save,
    canUndo,
    canRedo,
    undo,
    redo,
    setHistoryIndex,
    canvasHistory,
  };
};
