"use client";

import { useLanguage } from "@/contexts/language-context";

export const Banner = () => {
  const { t } = useLanguage();

  return (
    <div className="w-full text-center pt-2 md:pt-4">
      <h1
        className="text-3xl md:text-5xl font-bold leading-[1.2] tracking-tight pb-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 bg-clip-text text-transparent"
        style={{ fontFamily: '"Canva Sans", "Avenir Next", "Nunito Sans", sans-serif' }}
      >
        {t.bannerTitle}
      </h1>
    </div>
  );
};
