"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";

import { useSignUp } from "@/features/auth/hooks/use-sign-up";
import { useLanguage } from "@/contexts/language-context";
import { Language } from "@/lib/translations";

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "jp", label: "日本語" },
];

export const SignUpCard = () => {
  const { t, language } = useLanguage();
  const mutation = useSignUp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(language);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (password !== confirmPassword) {
      setPasswordError(t.passwordsNoMatch);
      return;
    }

    setLoading(true);
    mutation.mutate(
      { name, email, password, language: preferredLanguage },
      {
        onSuccess: () => {
          signIn("credentials", { email, password, callbackUrl: "/" });
        },
        onError: () => setLoading(false),
      }
    );
  };

  const isLoading = mutation.isPending || loading;

  const languageLabelMap = {
    en: "English",
    vi: "Tiếng Việt",
    jp: "日本語",
  } as const;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full">
      <div className="mb-6">
        <span className="text-2xl font-extrabold text-white bg-indigo-600 px-3 py-1 rounded-lg tracking-tight">
          {t.appName}
        </span>
      </div>

      {!!mutation.error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2 text-sm text-red-600 mb-5">
          <TriangleAlert className="size-4 shrink-0" />
          <p>{t.somethingWrong}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              {t.fullName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              {t.preferredLanguage}
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as Language)}
              disabled={isLoading}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-60"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {languageLabelMap[option.value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            {t.email}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              {t.password}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                disabled={isLoading}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-60"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              {t.confirmPassword}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-60"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        {passwordError && (
          <p className="text-xs text-red-500 -mt-2">{passwordError}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {t.createAccount}
        </button>
      </form>

      <p className="text-sm text-center text-gray-500 mt-6">
        {t.alreadyMember}{" "}
        <Link href="/sign-in" className="text-indigo-600 font-semibold hover:underline">
          {t.signIn}
        </Link>
      </p>
    </div>
  );
};
