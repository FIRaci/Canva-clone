"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Banner } from "./banner";
import { ProjectsSection } from "./projects-section";
import { Input } from "@/components/ui/input";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useLanguage } from "@/contexts/language-context";

export const HomeContent = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const { data } = useGetProjects();

  const matchedProjects = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    const allProjects = data?.pages.flatMap((group) => group.data) ?? [];
    return allProjects.filter((project) => project.name.toLowerCase().includes(normalized));
  }, [data?.pages, searchQuery]);

  const shouldShowSearchModal = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col space-y-6 max-w-screen-xl mx-auto pb-10">
      <Banner />

      <div className="relative max-w-2xl mx-auto w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t.searchAllContents}
          className="h-12 rounded-full bg-card pl-11 pr-4 text-sm shadow-sm"
        />

        {shouldShowSearchModal && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-80 overflow-auto rounded-2xl border border-border bg-card p-2 shadow-xl">
            {matchedProjects.length > 0 ? (
              <div className="space-y-1">
                {matchedProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => router.push(`/editor/${project.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-accent"
                  >
                    <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {project.thumbnailUrl ? (
                        <Image
                          fill
                          src={project.thumbnailUrl}
                          alt={project.name}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-violet-100 to-blue-100" />
                      )}
                    </div>
                    <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-4 text-sm text-muted-foreground">{t.noMatchingProjects}</p>
            )}
          </div>
        )}
      </div>
      <ProjectsSection />
    </div>
  );
};
