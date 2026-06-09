"use client";

import { useLanguage } from "@/contexts/language-context";
import { Language } from "@/lib/translations";

const LANGUAGES: { value: Language; flag: string; label: string }[] = [
  { value: "en", flag: "🇺🇸", label: "EN" },
  { value: "vi", flag: "🇻🇳", label: "VI" },
  { value: "jp", flag: "🇯🇵", label: "JP" },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.value}
          onClick={() => setLanguage(lang.value)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            language === lang.value
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
        >
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
