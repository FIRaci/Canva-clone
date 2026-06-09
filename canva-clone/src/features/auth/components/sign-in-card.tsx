"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, TriangleAlert, User } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useLanguage } from "@/contexts/language-context";

const DEMO_ACCOUNTS = [
  { key: "demoAccountA", email: "demo.a@canvar.com", password: "demo123" },
  { key: "demoAccountB", email: "demo.b@canvar.com", password: "demo123" },
];

export const SignInCard = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const params = useSearchParams();
  const error = params.get("error");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    signIn("credentials", {
      email,
      password,
      remember: keepLoggedIn ? "1" : "0",
      callbackUrl: "/",
    });
  };

  const onDemoLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    setDemoLoading(account.key);
    signIn("credentials", {
      email: account.email,
      password: account.password,
      remember: keepLoggedIn ? "1" : "0",
      callbackUrl: "/",
    });
  };

  const onGoogleLogin = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full">
      <div className="mb-6">
        <span className="text-2xl font-extrabold text-white bg-indigo-600 px-3 py-1 rounded-lg tracking-tight">
          {t.appName}
        </span>
      </div>

      {/* Demo accounts */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
          {t.quickDemoAccess}
        </p>
        <div className="flex gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.key}
              onClick={() => onDemoLogin(account)}
              disabled={!!demoLoading || loading || googleLoading}
              className="flex-1 border border-indigo-200 bg-white hover:bg-indigo-50 rounded-lg py-2 text-xs font-medium text-indigo-700 flex items-center justify-center gap-1.5 transition disabled:opacity-60"
            >
              {demoLoading === account.key
                ? <Loader2 className="size-3 animate-spin" />
                : <User className="size-3" />
              }
              {t[account.key as "demoAccountA" | "demoAccountB"]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-indigo-400 mt-2">
          {t.password}: <span className="font-mono font-semibold">demo123</span>
        </p>
      </div>

      {!!error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2 text-sm text-red-600 mb-5">
          <TriangleAlert className="size-4 shrink-0" />
          <p>{t.invalidCredentials}</p>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">{t.orSignInManually}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            {t.email}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            required
            disabled={loading || !!demoLoading || googleLoading}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-60"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.password}
            </label>
            <Link href="/forgot-password" className="text-xs text-indigo-600 hover:underline font-medium">
              {t.forgotPassword}
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              required
              disabled={loading || !!demoLoading || googleLoading}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
          <input
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            disabled={loading || !!demoLoading || googleLoading}
            className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>{t.keepLoggedIn}</span>
        </label>

        <button
          type="submit"
          disabled={loading || !!demoLoading || googleLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {t.signInNow}
        </button>
      </form>

      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={loading || !!demoLoading || googleLoading}
        className="mt-3 w-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-semibold rounded-xl py-3 text-sm transition flex items-center justify-center gap-2"
      >
        {googleLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-1.9 3.1l3 2.3c1.8-1.6 2.8-4 2.8-6.8 0-.7-.1-1.4-.2-2H12z" />
            <path fill="#34A853" d="M6.6 14.3l-.7.6-2.5 1.9C5 19.9 8.2 22 12 22c2.7 0 4.9-.9 6.5-2.5l-3-2.3c-.8.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.2z" />
            <path fill="#4A90E2" d="M3.4 7.2C2.5 8.9 2 10.4 2 12s.5 3.1 1.4 4.8c0 0 3.2-2.5 3.2-2.5-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8z" />
            <path fill="#FBBC05" d="M12 5.8c1.5 0 2.8.5 3.9 1.5l2.9-2.9C16.9 2.5 14.7 2 12 2 8.2 2 5 4.1 3.4 7.2l3.2 2.5c.8-2.4 3.1-3.9 5.4-3.9z" />
          </svg>
        )}
        {t.signInWithGoogle}
      </button>

      <p className="text-sm text-center text-gray-500 mt-6">
        {t.noAccount}{" "}
        <Link href="/sign-up" className="text-indigo-600 font-semibold hover:underline">
          {t.joinFree}
        </Link>
      </p>
    </div>
  );
};
