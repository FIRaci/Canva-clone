"use client";

import Image from "next/image";
import { Bell } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  messageKey: "notificationAutoThumbnail" | "notificationTemplateShared";
  createdAt: string;
  unread: boolean;
  senderType: "app" | "user";
  senderName: string;
};

const demoNotifications: NotificationItem[] = [
  {
    id: "1",
    messageKey: "notificationAutoThumbnail",
    createdAt: "2026-05-23T09:35:00",
    unread: true,
    senderType: "app",
    senderName: "SlideRaku",
  },
  {
    id: "2",
    messageKey: "notificationTemplateShared",
    createdAt: "2026-05-22T20:15:00",
    unread: false,
    senderType: "user",
    senderName: "Nguyen An",
  },
];

interface NotificationsButtonProps {
  collapsed?: boolean;
}

export const NotificationsButton = ({ collapsed = false }: NotificationsButtonProps) => {
  const { t, language } = useLanguage();
  const unreadCount = demoNotifications.filter((item) => item.unread).length;

  const locale = language === "vi" ? "vi-VN" : language === "jp" ? "ja-JP" : "en-US";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex h-10 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left text-sm font-medium text-foreground transition hover:bg-accent",
            collapsed && "justify-center px-0",
          )}
          aria-label={t.notifications}
        >
          <Bell className="size-4" />
          {!collapsed && <span>{t.notifications}</span>}
          {unreadCount > 0 && (
            <span className={cn("absolute right-3 top-2 size-2 rounded-full bg-red-500", collapsed && "right-2 top-2")} />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{t.notifications}</p>
        </div>

        <div className="max-h-80 overflow-auto p-2">
          {demoNotifications.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{t.noNotifications}</p>
          ) : (
            demoNotifications.map((item) => (
              <div key={item.id} className="mb-1 flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-accent">
                {item.senderType === "app" ? (
                  <div className="relative mt-0.5 size-8 shrink-0 overflow-hidden rounded-full border border-border bg-white">
                    <Image src="/logo.svg" alt={t.appName} fill className="p-1" />
                  </div>
                ) : (
                  <Avatar className="mt-0.5 size-8 shrink-0">
                    <AvatarFallback className="bg-indigo-600 text-xs font-semibold text-white">
                      {item.senderName
                        .split(" ")
                        .map((segment) => segment[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-5 text-foreground">{t[item.messageKey]}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString(locale, {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
