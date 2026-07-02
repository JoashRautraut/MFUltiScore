"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthUser,
  clearAuthUser,
  getAllRegisteredUsers,
  getAuthUser,
  isAdmin,
  removeRegisteredUser,
} from "@/lib/auth";

export default function AdminPage() {
  const router = useRouter();
  const [authUser, setAuthUserState] = useState<AuthUser | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [registeredUsers, setRegisteredUsers] = useState(getAllRegisteredUsers());
  const [actionError, setActionError] = useState("");
  const [removingUsername, setRemovingUsername] = useState<string | null>(null);

  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAdmin(user)) {
      router.replace("/");
      return;
    }

    setAuthUserState(user);
    setRegisteredUsers(getAllRegisteredUsers());
    setIsCheckingAccess(false);
  }, [router]);

  function handleLogout() {
    clearAuthUser();
    router.replace("/login");
  }

  function handleRemoveAccount(targetUsername: string) {
    if (!authUser) {
      return;
    }

    const confirmed = window.confirm(
      `Remove account "${targetUsername}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setActionError("");
    setRemovingUsername(targetUsername);

    const result = removeRegisteredUser(targetUsername, authUser);
    if (!result.ok) {
      setActionError(result.error);
      setRemovingUsername(null);
      return;
    }

    setRegisteredUsers(getAllRegisteredUsers());
    setRemovingUsername(null);
  }

  if (isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <p className="text-sm text-slate-500">Loading admin panel...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-3xl border border-violet-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
                Admin Panel
              </p>
              <h1 className="mt-2 text-3xl font-semibold">MFULTISCORE Admin</h1>
              <p className="mt-2 text-sm text-slate-600">
                Signed in as {authUser?.playerName} (@{authUser?.username})
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open app
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Registered users</h2>
          <p className="mt-1 text-sm text-slate-500">
            View all accounts and remove users when needed.
          </p>

          {actionError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {registeredUsers.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              No registered users yet.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Username</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Player name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Gender</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {registeredUsers.map((user) => {
                    const isCurrentUser =
                      authUser?.username.toLowerCase() === user.username.toLowerCase();

                    return (
                      <tr key={user.username}>
                        <td className="px-4 py-3 font-medium text-slate-900">{user.username}</td>
                        <td className="px-4 py-3 text-slate-700">{user.playerName}</td>
                        <td className="px-4 py-3 capitalize text-slate-700">{user.gender}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-violet-100 text-violet-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isCurrentUser ? (
                            <span className="text-xs text-slate-400">Your account</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveAccount(user.username)}
                              disabled={removingUsername === user.username}
                              className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {removingUsername === user.username ? "Removing..." : "Remove"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
