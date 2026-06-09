"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";

type ProfileData = {
  name: string;
  email: string;
  image: string | null;
  language: "en" | "vi" | "jp";
  google: {
    connected: boolean;
    accountLabel: string;
  };
};

const LANGUAGE_OPTIONS: Array<{ value: ProfileData["language"]; label: string }> = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "jp", label: "日本語" },
];

export const ProfilePage = () => {
  const { t, setLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  const initials = useMemo(() => {
    if (!profile?.name) return "U";
    return profile.name
      .split(" ")
      .map((chunk) => chunk[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.name]);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(t.failedLoadProfile);
      }

      const payload = (await response.json()) as { data: ProfileData };
      setProfile(payload.data);
    } catch {
      toast.error(t.failedLoadProfile);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateProfile = async (patch: Partial<Pick<ProfileData, "name" | "email" | "language" | "image">>) => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      const payload = (await response.json()) as { data?: ProfileData; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || t.failedUpdateProfile);
      }

      setProfile(payload.data);
      toast.success(t.profileUpdated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.failedUpdateProfile);
    } finally {
      setIsSaving(false);
    }
  };

  const onChangePhoto = async () => {
    if (!profile) return;

    const url = window.prompt(t.enterPhotoUrl, profile.image ?? "")?.trim();
    if (!url || url === profile.image) return;

    await updateProfile({ image: url });
  };

  const onRemovePhoto = async () => {
    await updateProfile({ image: null });
  };

  const onDisconnectGoogle = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile?provider=google", {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || t.failedDisconnectGoogle);
      }

      await loadProfile();
      toast.success(t.googleAccountDisconnected);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.failedDisconnectGoogle);
      setIsLoading(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 pb-10">
      <h1 className="text-center text-3xl font-bold text-foreground">{t.yourProfile}</h1>

      <section className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t.profilePhoto}</p>
            <Avatar className="size-20">
              <AvatarImage src={profile.image ?? ""} alt={profile.name} />
              <AvatarFallback className="bg-indigo-600 text-xl font-semibold text-white">{initials}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onRemovePhoto} disabled={isSaving}>
              {t.removePhoto}
            </Button>
            <Button onClick={onChangePhoto} disabled={isSaving}>
              {t.changePhoto}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t.nameLabel}</p>
            <div className="flex items-start gap-2">
              <div className="w-full max-w-md">
                {editingName ? (
                  <Input
                    autoFocus
                    value={profile.name}
                    onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        setEditingName(false);
                        updateProfile({ name: profile.name });
                      }
                    }}
                    onBlur={() => {
                      setEditingName(false);
                      updateProfile({ name: profile.name });
                    }}
                  />
                ) : (
                  <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">{profile.name}</p>
                )}
              </div>
              <Button variant="ghost" onClick={() => setEditingName(true)} disabled={isSaving}>
                {t.edit}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t.emailAddress}</p>
            <div className="flex items-start gap-2">
              <div className="w-full max-w-md">
                {editingEmail ? (
                  <Input
                    autoFocus
                    value={profile.email}
                    onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        setEditingEmail(false);
                        updateProfile({ email: profile.email });
                      }
                    }}
                    onBlur={() => {
                      setEditingEmail(false);
                      updateProfile({ email: profile.email });
                    }}
                  />
                ) : (
                  <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">{profile.email}</p>
                )}
              </div>
              <Button variant="ghost" onClick={() => setEditingEmail(true)} disabled={isSaving}>
                {t.edit}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t.languageLabel}</p>
            <div className="w-full max-w-md">
              <select
                value={profile.language}
                onChange={(event) => {
                  const language = event.target.value as ProfileData["language"];
                  setProfile({ ...profile, language });
                  setLanguage(language);
                  updateProfile({ language });
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isSaving}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">{t.connectedSocialAccounts}</h2>

        {profile.google.connected ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-white">
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-1.9 3.1l3 2.3c1.8-1.6 2.8-4 2.8-6.8 0-.7-.1-1.4-.2-2H12z" />
                  <path fill="#34A853" d="M6.6 14.3l-.7.6-2.5 1.9C5 19.9 8.2 22 12 22c2.7 0 4.9-.9 6.5-2.5l-3-2.3c-.8.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.2z" />
                  <path fill="#4A90E2" d="M3.4 7.2C2.5 8.9 2 10.4 2 12s.5 3.1 1.4 4.8c0 0 3.2-2.5 3.2-2.5-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8z" />
                  <path fill="#FBBC05" d="M12 5.8c1.5 0 2.8.5 3.9 1.5l2.9-2.9C16.9 2.5 14.7 2 12 2 8.2 2 5 4.1 3.4 7.2l3.2 2.5c.8-2.4 3.1-3.9 5.4-3.9z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Google</p>
                <p className="text-xs text-muted-foreground">{profile.google.accountLabel}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onDisconnectGoogle} disabled={isSaving}>
              {t.disconnect}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noAccountLinked}</p>
        )}
      </section>
    </div>
  );
};
