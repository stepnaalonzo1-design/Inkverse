"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action-button";
import { useToast } from "@/components/toast-provider";
import { Avatar } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatDate, timeAgo } from "@/lib/utils";

export type AdminUserRowData = {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  bookmarkCount: number;
  chaptersRead: number;
};

export function AdminUserRow({ user, isSelf }: { user: AdminUserRowData; isSelf: boolean }) {
  const router = useRouter();
  const { notify } = useToast();
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [pending, setPending] = useState(false);
  const dirty = role !== user.role || status !== user.status;

  async function save() {
    const body: Record<string, string> = {};
    if (role !== user.role) body.role = role;
    if (status !== user.status) body.status = status;

    setPending(true);
    const result = await api(`/api/admin/users/${user.id}`, "PATCH", body);
    setPending(false);

    if (!result.ok) {
      setRole(user.role);
      setStatus(user.status);
      notify({ tone: "error", title: "Update failed", description: result.data.error });
      return;
    }
    notify({ tone: "success", title: "User updated", description: `${user.username} has been updated.` });
    router.refresh();
  }

  return (
    <tr className="align-middle transition hover:bg-white/[0.03]">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.username} src={user.avatarUrl} size={36} />
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {user.username} {isSelf ? <span className="text-xs text-violet-300">(you)</span> : null}
            </p>
            <p className="truncate text-xs text-ink-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <select
          aria-label={`Role for ${user.username}`}
          value={role}
          disabled={isSelf || pending}
          onChange={(e) => setRole(e.target.value)}
          className="input h-9 w-auto py-1 text-xs"
        >
          <option value="user">User</option>
          <option value="admin">Administrator</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          aria-label={`Status for ${user.username}`}
          value={status}
          disabled={isSelf || pending}
          onChange={(e) => setStatus(e.target.value)}
          className="input h-9 w-auto py-1 text-xs"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </td>
      <td className="px-3 py-3 text-xs text-ink-400">{formatDate(user.createdAt)}</td>
      <td className="px-3 py-3 text-xs text-ink-400">{user.lastLoginAt ? timeAgo(user.lastLoginAt) : "Never"}</td>
      <td className="px-3 py-3 text-xs text-ink-400">
        {user.bookmarkCount} bookmarks · {user.chaptersRead} read
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          {dirty ? (
            <button type="button" onClick={save} disabled={pending} className="btn btn-primary px-3 py-2 text-xs">
              {pending ? "Saving…" : "Save"}
            </button>
          ) : null}
          {!isSelf ? (
            <ActionButton
              url={`/api/admin/users/${user.id}`}
              label="Delete"
              variant="danger"
              successTitle="User deleted"
              confirmMessage={`Permanently delete ${user.username} and all of their library data?`}
            />
          ) : null}
        </div>
      </td>
    </tr>
  );
}
