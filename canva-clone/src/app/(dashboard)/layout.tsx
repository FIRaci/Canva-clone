"use client";

import { useState } from "react";

import { Sidebar } from "./sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return ( 
    <div className="bg-muted h-full">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <div className={collapsed ? "lg:pl-[96px] flex flex-col h-full" : "lg:pl-[300px] flex flex-col h-full"}>
        <main className="bg-white flex-1 overflow-auto p-8 lg:rounded-tl-2xl">
          {children}
        </main>
      </div>
    </div>
  );
};
 
export default DashboardLayout;
