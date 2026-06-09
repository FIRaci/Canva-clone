"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export const ForgotPasswordCard = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendCode = async () => {
    if (!email) {
      setError(t.enterEmailFirst);
      return;
    }

    setError("");
    setInfo("");
    setSendingCode(true);
    try {
      const res = await fetch("/api/users/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw new Error(t.couldNotSendCode);
      }

      setCodeSent(true);
      setInfo(t.codeSentInfo);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleOtpChange = (i: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const next = [...otp];
    next[i] = value.slice(-1);
    setOtp(next);

    if (value && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!codeSent) {
      setError(t.sendOtpFirst);
      return;
    }

    if (otp.some((d) => !d)) {
      setError(t.enterFullOtp);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.passwordsNoMatch);
      return;
    }

    setConfirming(true);
    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.join(""), newPassword }),
      });

      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t.invalidOtp);

      router.push("/sign-in");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConfirming(false);
    }
  };

  const isBusy = sendingCode || confirming;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full">
      <h2 className="text-lg font-bold text-gray-800 mb-5">{t.forgotPasswordTitle}</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2 text-sm text-red-600 mb-4">
          <TriangleAlert className="size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {info && (
        <p className="text-xs text-emerald-600 mb-4">{info}</p>
      )}

      <form onSubmit={onConfirm} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            {t.email}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isBusy}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          onClick={sendCode}
          disabled={isBusy}
          className="w-32 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition flex items-center justify-center gap-2"
        >
          {sendingCode ? <Loader2 className="size-4 animate-spin" /> : null}
          {t.sendCode}
        </button>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
            {t.otpCode}
          </label>
          <div className="flex gap-2 justify-between">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                disabled={isBusy || !codeSent}
                className="w-10 h-12 text-center text-lg font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 transition disabled:opacity-60"
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            {t.newPassword}
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={3}
              disabled={isBusy}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
              disabled={isBusy}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={isBusy}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition flex items-center justify-center gap-2"
          >
            {confirming ? <Loader2 className="size-4 animate-spin" /> : null}
            {t.confirm}
          </button>
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            disabled={isBusy}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl py-3 text-sm transition"
          >
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  );
};
