"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuthUser,
  isAdminRegisterUnlocked,
  PlayerGender,
} from "@/lib/auth";
import { registerAccount } from "@/lib/client-api";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [gender, setGender] = useState<PlayerGender>("male");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    if (getAuthUser()) {
      router.replace("/");
      return;
    }

    if (!isAdminRegisterUnlocked()) {
      router.replace("/login");
      return;
    }

    setIsCheckingAccess(false);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await registerAccount({
        username,
        password,
        playerName,
        gender,
        role: "admin",
      });
      router.push("/login?adminRegistered=1");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to create admin account.",
      );
      setIsSubmitting(false);
    }
  }

  if (isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <p className="text-sm text-slate-500">Checking access...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8 text-slate-900">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-violet-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
            Admin Access
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Create admin account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Register an admin with username, password, player name, and gender.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-600">Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose an admin username"
                autoComplete="username"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600">Player name</span>
              <input
                type="text"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Admin name on the field"
                autoComplete="name"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600">Gender</span>
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value as PlayerGender)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-violet-400"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Creating admin..." : "Create admin account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            <Link href="/login" className="font-medium text-violet-600 hover:text-violet-700">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
