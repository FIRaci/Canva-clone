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
        const target = event.target;
        
        if (target && ["text", "i-text", "textbox"].includes(target.type || "")) {
          const scaleX = target.scaleX || 1;
          const scaleY = target.scaleY || 1;
          
          if (scaleX !== 1 || scaleY !== 1) {
            const fontSize = (target as any).fontSize || 1;
            
            target.set({
              fontSize: Math.round(fontSize * scaleX),
              scaleX: 1,
              scaleY: 1,
            });
            
            if (target.type === "textbox") {
              target.set({
                width: Math.round(target.width! * scaleX),
              });
            }
            
            canvas.requestRenderAll();
          }
        }

        if (isHistoryLocked() || isTransientObject(event.target as fabric.Object | undefined)) {
          return;
        }
        
        setSelectedObjects([...canvas.getActiveObjects()]);
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
