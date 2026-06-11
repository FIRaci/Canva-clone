"use client";

import { fabric } from "fabric";
import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, User, Send, Trash2, Wand2, Layers, ChevronDown, ChevronUp, Loader2, Plus, Mic } from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import type { AIChatResponse, CanvasAction } from "@/app/api/[[...route]]/ai";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

// ── Canvas executor (Fabric.js v5) ────────────────────────────────────────────

function executeActions(canvas: fabric.Canvas, actions: CanvasAction[], clearFirst: boolean) {
  if (clearFirst) {
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
  }

  for (const action of actions) {
    switch (action.type) {
      case "set_background": {
        canvas.backgroundColor = action.fill ?? "#ffffff";
        break;
      }
      case "add_text": {
        const obj = new fabric.IText(action.text ?? "Text", {
          left: action.left ?? 60,
          top: action.top ?? 60,
          width: action.width ?? 840,
          fontSize: action.fontSize ?? 28,
          fill: action.fill ?? "#111111",
          fontWeight: action.fontWeight ?? "normal",
          fontStyle: (action.fontStyle as "" | "normal" | "italic" | "oblique") ?? "normal",
          textAlign: action.textAlign ?? "left",
          fontFamily: action.fontFamily ?? "Arial",
        });
        canvas.add(obj);
        break;
      }
      case "add_rect": {
        const obj = new fabric.Rect({
          left: action.left ?? 0,
          top: action.top ?? 0,
          width: action.width ?? 200,
          height: action.height ?? 100,
          fill: action.fill ?? "#6366f1",
          stroke: action.stroke,
          strokeWidth: action.strokeWidth ?? 0,
          opacity: action.opacity ?? 1,
        });
        canvas.add(obj);
        break;
      }
      case "add_circle": {
        const obj = new fabric.Circle({
          left: action.left ?? 0,
          top: action.top ?? 0,
          radius: action.radius ?? 60,
          fill: action.fill ?? "#6366f1",
          opacity: action.opacity ?? 1,
        });
        canvas.add(obj);
        break;
      }
      case "add_triangle": {
        const obj = new fabric.Triangle({
          left: action.left ?? 0,
          top: action.top ?? 0,
          width: action.width ?? 120,
          height: action.height ?? 100,
          fill: action.fill ?? "#6366f1",
        });
        canvas.add(obj);
        break;
      }
      case "add_line": {
        const obj = new fabric.Line(
          [action.x1 ?? 0, action.y1 ?? 0, action.x2 ?? 200, action.y2 ?? 0],
          { stroke: action.stroke ?? "#111111", strokeWidth: action.strokeWidth ?? 2 }
        );
        canvas.add(obj);
        break;
      }
    }
  }

  canvas.renderAll();
  // Trigger autosave
  const firstObj = canvas.getObjects()[0];
  if (firstObj) canvas.fire("object:modified", { target: firstObj });
}

// ── Action label helper ───────────────────────────────────────────────────────

function actionLabel(a: CanvasAction, t: ReturnType<typeof useLanguage>["t"]): string {
  switch (a.type) {
    case "set_background": return `${t.chatActionSetBg} ${a.fill}`;
    case "add_text": return `${t.chatActionAddText} "${(a.text ?? "").slice(0, 28)}${(a.text ?? "").length > 28 ? "…" : ""}"`;
    case "add_rect": return `${t.chatActionAddRect} (${a.width}×${a.height})`;
    case "add_circle": return `${t.chatActionAddCircle} (r=${a.radius})`;
    case "add_triangle": return `${t.chatActionAddTriangle}`;
    case "add_line": return `${t.chatActionAddLine}`;
    default: return (a as { type: string }).type;
  }
}

// ── Pending actions preview ───────────────────────────────────────────────────

function PendingActions({
  response,
  onApply,
  onDismiss,
}: {
  response: AIChatResponse;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl overflow-hidden mx-2">
      <div className="px-3 py-2.5 flex items-start gap-2">
        <Wand2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-800 mb-0.5">
            {response.clearFirst ? t.chatCreateNew : t.chatUpdateCanvas}
          </p>
          <p className="text-[11px] text-indigo-600">
            {response.actions.length} {t.chatChangesWillBeApplied}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-indigo-400 hover:text-indigo-700 transition-colors mt-0.5"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-indigo-100 bg-white/60 px-3 py-2 space-y-1 max-h-36 overflow-y-auto">
          {response.clearFirst && (
            <p className="text-[10px] text-red-500 font-medium mb-1">{t.chatCanvasCleared}</p>
          )}
          {response.actions.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-gray-600">
              <Layers className="w-3 h-3 text-indigo-300 shrink-0" />
              {actionLabel(a, t)}
            </div>
          ))}
        </div>
      )}

      <div className="px-3 py-2 flex gap-2 border-t border-indigo-100">
        <button
          onClick={onApply}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Wand2 className="w-3 h-3" />
          {t.chatApply}
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs rounded-lg transition-colors"
        >
          {t.chatDismiss}
        </button>
      </div>
    </div>
  );
}

// ── ChatSidebar ───────────────────────────────────────────────────────────────

export const ChatSidebar = ({ editor, activeTool, onChangeActiveTool }: ChatSidebarProps) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<AIChatResponse | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const QUICK_PROMPTS = [
    t.chatQuickPrompt1,
    t.chatQuickPrompt2,
    t.chatQuickPrompt3,
    t.chatQuickPrompt4,
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pendingResponse]);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, content }]);
  }, []);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setPendingResponse(null);
    addMessage("user", text);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as AIChatResponse;

      addMessage("assistant", data.message);
      if (data.actions && data.actions.length > 0) {
        setPendingResponse(data);
      }
    } catch {
      addMessage("assistant", t.chatErrorAPI);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!pendingResponse || !editor) return;
    setApplying(true);
    try {
      executeActions(editor.canvas, pendingResponse.actions, pendingResponse.clearFirst);
      addMessage("assistant", `${t.chatApplied} ${pendingResponse.actions.length} ${t.chatChangesApplied}`);
    } catch {
      addMessage("assistant", t.chatError);
    } finally {
      setPendingResponse(null);
      setApplying(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-l z-[40] w-[360px] h-full flex flex-col",
        activeTool === "chat" ? "visible" : "hidden",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Bot className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">{t.chatSidebarTitle}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{t.chatSidebarDesc}</p>
          </div>
        </div>
        <button
          onClick={() => setMessages([])}
          title={t.chatClearHistory}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <Bot className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 mb-1">{t.chatHowCanIHelp}</p>
              <p className="text-xs text-gray-400">{t.chatDescribeDesign}</p>
            </div>
            <div className="w-full space-y-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="w-full text-left px-3 py-2 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors leading-relaxed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === "user" ? "bg-indigo-600" : "bg-white border border-gray-200"
                }`}>
                  {msg.role === "user"
                    ? <User className="w-3 h-3 text-white" />
                    : <Bot className="w-3 h-3 text-indigo-500" />
                  }
                </div>
                <div className={`max-w-[240px] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-indigo-500" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {pendingResponse && !loading && !applying && (
              <PendingActions
                response={pendingResponse}
                onApply={handleApply}
                onDismiss={() => setPendingResponse(null)}
              />
            )}

            {applying && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2.5 mx-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.chatApplying}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <button
            type="button"
            disabled={loading || applying}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
            title={t.chatAttachFile}
            aria-label={t.chatAttachFile}
          >
            <Plus className="w-4 h-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.chatPlaceholder}
            rows={2}
            disabled={loading || applying}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors disabled:opacity-60"
          />
          <button
            type="button"
            disabled={loading || applying}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
            title={t.chatVoiceInput}
            aria-label={t.chatVoiceInput}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading || applying}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          {t.chatEnterToSend}
        </p>
      </div>

      <ToolSidebarClose onClick={() => onChangeActiveTool("select")} />
    </aside>
  );
};
