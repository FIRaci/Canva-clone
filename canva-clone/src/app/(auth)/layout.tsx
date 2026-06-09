"use client";

import { LanguageSwitcher } from "@/components/language-switcher";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="fixed top-4 right-4 bg-white rounded-xl px-2 py-1 shadow-sm border border-gray-200">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
