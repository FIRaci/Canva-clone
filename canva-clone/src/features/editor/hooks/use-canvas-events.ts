import { fabric } from "fabric";
import { useEffect } from "react";

interface UseCanvasEventsProps {
  save: () => void;
  canvas: fabric.Canvas | null;
  setSelectedObjects: (objects: fabric.Object[]) => void;
  clearSelectionCallback?: () => void;
};

export const useCanvasEvents = ({
  save,
  canvas,
  setSelectedObjects,
  clearSelectionCallback,
}: UseCanvasEventsProps) => {
  useEffect(() => {
    if (canvas) {
      const isHistoryLocked = () => {
        return Number((canvas as any).__historyLockCount || 0) > 0;
      };

      const isTransientObject = (target?: fabric.Object) => {
        return Boolean((target as any)?.__transientCropUi);
      };

      const onObjectAdded = (event: fabric.IEvent) => {
        if (isHistoryLocked() || isTransientObject(event.target as fabric.Object | undefined)) {
          return;
        }
        save();
      };

      const onObjectRemoved = (event: fabric.IEvent) => {
        if (isHistoryLocked() || isTransientObject(event.target as fabric.Object | undefined)) {
          return;
        }
        save();
      };

      const onObjectModified = (event: fabric.IEvent) => {
        if (isHistoryLocked() || isTransientObject(event.target as fabric.Object | undefined)) {
          return;
        }
        save();
      };

      const onSelectionCreated = (e: fabric.IEvent) => {
        setSelectedObjects(e.selected || []);
      };

      const onSelectionUpdated = (e: fabric.IEvent) => {
        setSelectedObjects(e.selected || []);
      };

      const onSelectionCleared = () => {
        setSelectedObjects([]);
        clearSelectionCallback?.();
      };

      canvas.on("object:added", onObjectAdded);
      canvas.on("object:removed", onObjectRemoved);
      canvas.on("object:modified", onObjectModified);
      canvas.on("selection:created", onSelectionCreated);
      canvas.on("selection:updated", onSelectionUpdated);
      canvas.on("selection:cleared", onSelectionCleared);

      return () => {
        canvas.off("object:added", onObjectAdded);
        canvas.off("object:removed", onObjectRemoved);
        canvas.off("object:modified", onObjectModified);
        canvas.off("selection:created", onSelectionCreated);
        canvas.off("selection:updated", onSelectionUpdated);
        canvas.off("selection:cleared", onSelectionCleared);
      };
    }

    return () => {
      // no-op
    };
  },
  [
    save,
    canvas,
    clearSelectionCallback,
    setSelectedObjects // No need for this, this is from setState
  ]);
};
