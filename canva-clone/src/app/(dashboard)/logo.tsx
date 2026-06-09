"use client";

import Link from "next/link";
import Image from "next/image";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Space_Grotesk } from "next/font/google";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

const font = Space_Grotesk({
  weight: ["700"],
  subsets: ["latin"],
});

interface LogoProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Logo = ({ collapsed, onToggle }: LogoProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center h-[68px] px-4 gap-x-2">
      <Link href="/" className={collapsed ? "flex items-center justify-center" : "flex items-center gap-x-2 hover:opacity-75 transition"}>
        <div className="size-8 relative shrink-0">
          <Image src="/logo.svg" alt={t.appName} fill />
        </div>
        {!collapsed && <h1 className={cn(font.className, "text-xl font-bold")}>{t.appName}</h1>}
      </Link>
      <button
        type="button"
        onClick={onToggle}
        className="ml-auto inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
        aria-label={collapsed ? t.expandSidebar : t.collapseSidebar}
      >
        {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
      </button>
    </div>
  );
};
