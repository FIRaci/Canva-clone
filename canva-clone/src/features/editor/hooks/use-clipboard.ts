import { fabric } from "fabric";
import { useCallback, useRef } from "react";

interface UseClipboardProps {
  canvas: fabric.Canvas | null;
};

export const useClipboard = ({
  canvas
}: UseClipboardProps) => {
  const clipboard = useRef<any>(null);

  const copy = useCallback(() => {
    canvas?.getActiveObject()?.clone((cloned: any) => {
      clipboard.current = cloned;
    });
  }, [canvas]);
  
  const paste = useCallback(() => {
    if (!canvas) return;

    const objectStyleTemplate = (canvas as any).__objectStyleTemplate;
    const textStyleTemplate = (canvas as any).__textStyleTemplate;
    const activeObject = canvas.getActiveObject();

    if (activeObject && (objectStyleTemplate || textStyleTemplate)) {
      if (textStyleTemplate && activeObject.type && ["text", "i-text", "textbox"].includes(activeObject.type)) {
        activeObject.set(textStyleTemplate);
      } else if (objectStyleTemplate) {
        activeObject.set({
          fill: objectStyleTemplate.fill,
          stroke: objectStyleTemplate.stroke,
          strokeWidth: objectStyleTemplate.strokeWidth,
          opacity: objectStyleTemplate.opacity,
          strokeDashArray: objectStyleTemplate.strokeDashArray,
        });
      }
      
      canvas.requestRenderAll();
      canvas.fire("object:modified", { target: activeObject });
      
      (canvas as any).__objectStyleTemplate = null;
      (canvas as any).__textStyleTemplate = null;
      return;
    }

    if (!clipboard.current) return;

    clipboard.current.clone((clonedObj: any) => {
      canvas?.discardActiveObject();
      clonedObj.set({
        left: clonedObj.left + 10,
        top: clonedObj.top + 10,
        evented: true,
      });

      if (clonedObj.type === "activeSelection") {
        clonedObj.canvas = canvas;
        clonedObj.forEachObject((obj: any) => {
          canvas?.add(obj);
        });
        clonedObj.setCoords();
      } else {
        canvas?.add(clonedObj);
      }

      clipboard.current.top += 10;
      clipboard.current.left += 10;
      canvas?.setActiveObject(clonedObj);
      canvas?.requestRenderAll();
    });
  }, [canvas]);

  return { copy, paste };
};
