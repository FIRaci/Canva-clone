import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
};

export const SidebarItem = ({
  icon: Icon,
  label,
  href,
  isActive,
  onClick,
  collapsed = false,
}: SidebarItemProps) => {
  return (
    <Link href={href} onClick={onClick}>
      <div className={cn(
        "flex items-center px-3 py-3 rounded-xl bg-transparent hover:bg-white transition",
        collapsed && "justify-center",
        isActive && "bg-white",
      )}>
        <Icon className={cn("size-4 stroke-2", !collapsed && "mr-2")} />
        <span className={cn("text-sm font-medium", collapsed && "sr-only")}>
          {label}
        </span>
      </div>
    </Link>
  );
};
