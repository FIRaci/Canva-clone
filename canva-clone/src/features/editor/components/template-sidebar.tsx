import Image from "next/image";
import { AlertTriangle, Loader, Crown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";

import { 
  ActiveTool, 
  Editor,
} from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { useGetTemplates } from "@/features/projects/api/use-get-templates";
import { DEMO_TEMPLATES } from "@/app/(dashboard)/templates/templates-data";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/hooks/use-confirm";
import { useLanguage } from "@/contexts/language-context";

interface TemplateSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

const RECENT_TEMPLATE_IDS_KEY = "editor-recent-template-ids";
const MAX_RECENT_TEMPLATE_IDS = 8;

type SidebarTemplate = {
  id: string;
  templateKey: string;
  name: string;
  width: number;
  height: number;
  json: string;
  thumbnailUrl: string;
  isPro: boolean;
};

export const TemplateSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: TemplateSidebarProps) => {
  const { t } = useLanguage();
  const { shouldBlock, triggerPaywall } = usePaywall();
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>([]);

  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "You are about to replace the current project with this template."
  )

  const { data, isLoading, isError } = useGetTemplates({
    limit: "20",
    page: "1",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedIds = window.localStorage.getItem(RECENT_TEMPLATE_IDS_KEY);
      if (!storedIds) return;

      const parsed = JSON.parse(storedIds);
      if (Array.isArray(parsed)) {
        setRecentTemplateIds(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      setRecentTemplateIds([]);
    }
  }, []);

  const allTemplates = useMemo<SidebarTemplate[]>(() => {
    const demoTemplates: SidebarTemplate[] = DEMO_TEMPLATES.map((template) => ({
      id: template.id,
      templateKey: `demo:${template.id}`,
      name: template.name,
      width: template.width,
      height: template.height,
      json: template.json,
      thumbnailUrl: template.thumbnailDataUrl,
      isPro: false,
    }));

    const remoteTemplates: SidebarTemplate[] = (data ?? []).map((template) => ({
      id: template.id,
      templateKey: `remote:${template.id}`,
      name: template.name,
      width: template.width,
      height: template.height,
      json: template.json,
      thumbnailUrl: template.thumbnailUrl || "",
      isPro: Boolean(template.isPro),
    }));

    return [...demoTemplates, ...remoteTemplates];
  }, [data]);

  const recentTemplates = useMemo(() => {
    if (!allTemplates.length || !recentTemplateIds.length) {
      return [];
    }

    const templatesMap = new Map<string, SidebarTemplate>();
    allTemplates.forEach((template) => {
      templatesMap.set(template.templateKey, template);
      if (!templatesMap.has(template.id)) {
        templatesMap.set(template.id, template);
      }
    });

    return recentTemplateIds
      .map((templateId) => templatesMap.get(templateId))
      .filter((template): template is (typeof allTemplates)[number] => Boolean(template));
  }, [allTemplates, recentTemplateIds]);

  const nonRecentTemplates = useMemo(() => {
    if (!recentTemplates.length) {
      return allTemplates;
    }

    const recentIdsSet = new Set(recentTemplates.map((template) => template.templateKey));
    return allTemplates.filter((template) => !recentIdsSet.has(template.templateKey));
  }, [allTemplates, recentTemplates]);

  const markTemplateAsRecent = (templateId: string) => {
    setRecentTemplateIds((current) => {
      const nextIds = [templateId, ...current.filter((id) => id !== templateId)].slice(0, MAX_RECENT_TEMPLATE_IDS);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(RECENT_TEMPLATE_IDS_KEY, JSON.stringify(nextIds));
      }

      return nextIds;
    });
  };

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onClick = async (template: SidebarTemplate) => {
    if (template.isPro && shouldBlock) {
      triggerPaywall();
      return;
    }

    const ok = await confirm();

    if (ok) {
      editor?.loadJson(template.json);
      markTemplateAsRecent(template.templateKey);
    }
  };

  const renderTemplateGrid = (templates: SidebarTemplate[]) => {
    return (
      <div className="grid grid-cols-2 gap-4">
        {templates.map((template) => {
          return (
            <button
              style={{
                aspectRatio: `${template.width}/${template.height}`
              }}
              onClick={() => onClick(template)}
              key={template.templateKey}
              className="relative w-full group hover:opacity-75 transition bg-muted rounded-sm overflow-hidden border"
            >
              <Image
                fill
                src={template.thumbnailUrl}
                alt={template.name || "Template"}
                className="object-cover"
              />
              {template.isPro && (
                <div className="absolute top-2 right-2 size-8 items-center flex justify-center bg-black/50 rounded-full">
                  <Crown className="size-4 fill-yellow-500 text-yellow-500" />
                </div>
              )}
              <div
                className="opacity-0 group-hover:opacity-100 absolute left-0 bottom-0 w-full text-[10px] truncate text-white p-1 bg-black/50 text-left"
              >
                {template.name}
              </div>
            </button>
          )
        })}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "templates" ? "visible" : "hidden",
      )}
    >
      <ConfirmDialog />
      <ToolSidebarHeader
        title={t.templates}
        description={t.templatesDescription}
      />
      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <Loader className="size-4 text-muted-foreground animate-spin" />
        </div>
      )}
      {isError && (
        <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            Failed to fetch templates
          </p>
        </div>
      )}
      <ScrollArea>
        <div className="space-y-6 p-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t.recentlyUsed}</h3>
            {recentTemplates.length > 0 ? (
              renderTemplateGrid(recentTemplates)
            ) : (
              <p className="text-xs text-muted-foreground">
                {t.noRecentTemplatesYet}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t.all}</h3>
            {nonRecentTemplates.length > 0 ? (
              renderTemplateGrid(nonRecentTemplates)
            ) : (
              <p className="text-xs text-muted-foreground">
                {t.noTemplatesAvailable}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
