import { Logo } from "./logo";
import { SidebarRoutes } from "./sidebar-routes";
import { UserButton } from "@/features/auth/components/user-button";
import { NotificationsButton } from "./notifications-button";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  return (
    <aside className={collapsed ? "hidden lg:flex fixed flex-col w-[96px] left-0 shrink-0 h-full" : "hidden lg:flex fixed flex-col w-[300px] left-0 shrink-0 h-full"}>
      <Logo collapsed={collapsed} onToggle={onToggle} />
      <SidebarRoutes collapsed={collapsed} />
      <div className={collapsed ? "mt-auto space-y-2 px-3 pb-4" : "mt-auto space-y-2 px-3 pb-4"}>
        <NotificationsButton collapsed={collapsed} />
        <div className={collapsed ? "flex justify-center" : ""}>
          <UserButton />
        </div>
      </div>
    </aside>
  );
};
