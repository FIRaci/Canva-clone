import { useState } from "react";
import {
  Grid3X3,
  LineChart,
  MousePointerClick,
  PenLine,
  Shapes,
  Type,
} from "lucide-react";
import { toast } from "sonner";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolsSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  lineMode: "free" | "line" | "arrow";
  onChangeActiveTool: (tool: ActiveTool) => void;
  onChangeLineMode: (mode: "free" | "line" | "arrow") => void;
}

export const ToolsSidebar = ({
  editor,
  activeTool,
  lineMode,
  onChangeActiveTool,
  onChangeLineMode,
}: ToolsSidebarProps) => {
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState("3");
  const [tableColumns, setTableColumns] = useState("3");

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onOpenTool = (tool: ActiveTool) => {
    if (tool === "draw") {
      onChangeLineMode("free");
    }

    onChangeActiveTool(tool);
  };

  const onOpenLineTool = (mode: "line" | "arrow") => {
    onChangeLineMode(mode);
    if (activeTool !== "draw") {
      onChangeActiveTool("draw");
    }
    toast.info(`Selected ${mode}. Click and drag on canvas to draw.`);
  };

  const isLineToolActive = activeTool === "draw" && lineMode !== "free";
  const isToolsVisible = activeTool === "tools";

  const onInsertTable = () => {
    const rows = Number(tableRows);
    const columns = Number(tableColumns);

    if (!Number.isFinite(rows) || !Number.isFinite(columns) || rows <= 0 || columns <= 0) {
      toast.error("Please enter valid rows and columns");
      return;
    }

    editor?.addTable(rows, columns);
    onChangeActiveTool("select");
    setIsTableDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert table</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Rows</p>
                <Input value={tableRows} onChange={(event) => setTableRows(event.target.value)} inputMode="numeric" />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Columns</p>
                <Input value={tableColumns} onChange={(event) => setTableColumns(event.target.value)} inputMode="numeric" />
              </div>
            </div>
            <Button type="button" className="w-full" onClick={onInsertTable}>
              Insert table
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <aside
        className={cn(
          "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
          isToolsVisible ? "visible" : "hidden",
        )}
      >
        <ToolSidebarHeader title="Tools" description="Select a drawing or editing tool" />
        <ScrollArea>
          <div className="p-4 space-y-2">
            <Button type="button" variant="ghost" className="h-10 w-full justify-start" onClick={() => onOpenTool("select")}>
              <MousePointerClick className="mr-2 size-4" />
              Select
            </Button>
            <Button type="button" variant="ghost" className="h-10 w-full justify-start" onClick={() => onOpenTool("draw")}>
              <PenLine className="mr-2 size-4" />
              Draw
            </Button>
            <Button type="button" variant="ghost" className="h-10 w-full justify-start" onClick={() => onOpenTool("shapes")}>
              <Shapes className="mr-2 size-4" />
              Shapes
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn("h-10 w-full justify-start", isLineToolActive && "bg-gray-100")}
                >
                  <LineChart className="mr-2 size-4" />
                  Lines
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => onOpenLineTool("line")}>Line</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenLineTool("arrow")}>Arrow</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <p className="px-1 text-xs text-muted-foreground">Hold Shift while drawing to lock horizontal or vertical.</p>

            <Button type="button" variant="ghost" className="h-10 w-full justify-start" onClick={() => onOpenTool("text")}>
              <Type className="mr-2 size-4" />
              Text
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full justify-start"
              onClick={() => setIsTableDialogOpen(true)}
            >
              <Grid3X3 className="mr-2 size-4" />
              Tables
            </Button>
          </div>
        </ScrollArea>
        <ToolSidebarClose onClick={onClose} />
      </aside>
    </>
  );
};
