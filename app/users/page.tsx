"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type UserItem = {
  id: string;
  email: string | null;
  full_name: string;
  role: string;
  created_at: string | null;
  last_sign_in_at: string | null;
};

function roleStyle(role: string) {
  if (role === "admin")
    return "bg-violet-50 text-violet-700 border-violet-200";

  if (role === "engineer")
    return "bg-blue-50 text-blue-700 border-blue-200";

  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedUser, setSelectedUser] =
    useState<UserItem | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("engineer");

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("viewer");

  const [newPassword, setNewPassword] = useState("");

  const [saving, setSaving] = useState(false);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("You must be signed in.");
    }

    return session.access_token;
  }

  async function loadUsers() {
    setLoading(true);
    setMessage("");

    try {
      const token = await getToken();

      const res = await fetch("/api/users/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to load users."
        );
      }

      setUsers(data.users || []);
    } catch (error: any) {
      setMessage(
        error?.message || "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return users;

    return users.filter((user) => {
      return [
        user.full_name,
        user.email,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [users, search]);

  const adminCount = users.filter(
    (u) => u.role === "admin"
  ).length;

  const engineerCount = users.filter(
    (u) => u.role === "engineer"
  ).length;

  const viewerCount = users.filter(
    (u) => u.role === "viewer"
  ).length;

  function openCreate() {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("engineer");
    setMessage("");
    setCreateOpen(true);
  }

  async function createUser(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const token = await getToken();

      const res = await fetch(
        "/api/users/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            role,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to create user."
        );
      }

      setCreateOpen(false);
      setMessage(
        "User created successfully."
      );

      await loadUsers();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to create user."
      );
    } finally {
      setSaving(false);
    }
  }

  function openEdit(user: UserItem) {
    setSelectedUser(user);
    setEditName(user.full_name || "");
    setEditRole(user.role);
    setMessage("");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!selectedUser) return;

    setSaving(true);
    setMessage("");

    try {
      const token = await getToken();

      const res = await fetch(
        "/api/users/update",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: selectedUser.id,
            full_name: editName,
            role: editRole,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to update user."
        );
      }

      setEditOpen(false);
      setMessage(
        "User updated successfully."
      );

      await loadUsers();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to update user."
      );
    } finally {
      setSaving(false);
    }
  }

  function openReset(user: UserItem) {
    setSelectedUser(user);
    setNewPassword("");
    setMessage("");
    setResetOpen(true);
  }

  async function resetPassword() {
    if (!selectedUser) return;

    if (newPassword.length < 6) {
      setMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const token = await getToken();

      const res = await fetch(
        "/api/users/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: selectedUser.id,
            password: newPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to reset password."
        );
      }

      setResetOpen(false);
      setMessage(
        "Password updated successfully."
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to reset password."
      );
    } finally {
      setSaving(false);
    }
  }

  function openDelete(user: UserItem) {
    setSelectedUser(user);
    setMessage("");
    setDeleteOpen(true);
  }

  async function deleteUser() {
    if (!selectedUser) return;

    setSaving(true);
    setMessage("");

    try {
      const token = await getToken();

      const res = await fetch(
        "/api/users/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: selectedUser.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to delete user."
        );
      }

      setDeleteOpen(false);
      setSelectedUser(null);

      await loadUsers();

      setMessage(
        "User deleted successfully."
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to delete user."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb]">

      <div className="max-w-[1500px] mx-auto px-5 lg:px-8 py-8">

        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#102a56] via-[#16468d] to-[#2563eb] shadow-xl shadow-blue-100">

          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10" />

          <div className="relative p-7 md:p-10 flex flex-col xl:flex-row xl:items-end justify-between gap-7">

            <div>

              <div className="flex items-center gap-2 text-blue-200">
                <Users size={19} />

                <p className="text-xs font-black tracking-[0.2em] uppercase">
                  Access Management
                </p>
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white mt-3">
                Users Management Center
              </h1>

              <p className="text-blue-100 mt-3 max-w-2xl">
                Manage system users, roles and account access securely.
              </p>

            </div>

            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-white text-blue-800 hover:bg-blue-50 px-5 py-3 rounded-xl font-black"
            >
              <Plus size={18} />
              Add User
            </button>

          </div>

        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Total Users
            </p>

            <p className="text-3xl font-black mt-1">
              {users.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-violet-50 text-violet-700 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Admins
            </p>

            <p className="text-3xl font-black text-violet-600 mt-1">
              {adminCount}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
              <UserCog size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Engineers
            </p>

            <p className="text-3xl font-black text-blue-600 mt-1">
              {engineerCount}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Viewers
            </p>

            <p className="text-3xl font-black text-slate-600 mt-1">
              {viewerCount}
            </p>
          </div>

        </div>

        {message && (
          <div className="mt-5 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl px-5 py-4">
            {message}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm mt-6 overflow-hidden">

          <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">

            <div>
              <h2 className="text-xl font-black">
                System Users
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {filtered.length} user(s)
              </p>
            </div>

            <div className="relative">

              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search name, email or role..."
                className="bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 md:w-[340px]"
              />

            </div>

          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">
              Loading users...
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px]">

                <thead className="bg-slate-50">

                  <tr>
                    {[
                      "User",
                      "Email",
                      "Role",
                      "Created",
                      "Last Sign In",
                      "Actions",
                    ].map((label) => (
                      <th
                        key={label}
                        className="text-left px-5 py-4 text-[11px] uppercase tracking-wider font-black text-slate-500"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>

                </thead>

                <tbody>

                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-slate-100 hover:bg-blue-50/30"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                            {(user.full_name ||
                              user.email ||
                              "?")
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>

                          <p className="font-black text-slate-900">
                            {user.full_name ||
                              "Unnamed User"}
                          </p>

                        </div>

                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {user.email || "-"}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex border px-3 py-1.5 rounded-full text-xs font-black capitalize ${roleStyle(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {user.created_at
                          ? new Date(
                              user.created_at
                            ).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {user.last_sign_in_at
                          ? new Date(
                              user.last_sign_in_at
                            ).toLocaleString()
                          : "Never"}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <button
                            onClick={() =>
                              openEdit(user)
                            }
                            className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-xl text-sm font-bold"
                          >
                            <Pencil size={15} />
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              openReset(user)
                            }
                            className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-2 rounded-xl text-sm font-bold"
                          >
                            <KeyRound size={15} />
                            Password
                          </button>

                          <button
                            onClick={() =>
                              openDelete(user)
                            }
                            className="inline-flex items-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-bold"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

          <form
            onSubmit={createUser}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl"
          >

            <div className="p-6 border-b border-slate-200 flex justify-between">

              <div>
                <p className="text-xs font-black text-blue-600">
                  USER MANAGEMENT
                </p>

                <h2 className="text-xl font-black mt-1">
                  Create New User
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateOpen(false)
                }
                className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center"
              >
                <X size={18} />
              </button>

            </div>

            <div className="p-6 space-y-4">

              <input
                value={fullName}
                onChange={(e) =>
                  setFullName(
                    e.target.value
                  )
                }
                placeholder="Full Name"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              />

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="Email"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              />

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Temporary Password"
                minLength={6}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              />

              <select
                value={role}
                onChange={(e) =>
                  setRole(
                    e.target.value
                  )
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="admin">
                  Admin
                </option>
                <option value="engineer">
                  Engineer
                </option>
                <option value="viewer">
                  Viewer
                </option>
              </select>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

              <button
                type="button"
                onClick={() =>
                  setCreateOpen(false)
                }
                className="px-5 py-2.5 border rounded-xl font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 disabled:bg-slate-400 text-white rounded-xl font-black"
              >
                {saving
                  ? "Creating..."
                  : "Create User"}
              </button>

            </div>

          </form>

        </div>
      )}

      {editOpen && selectedUser && (
        <div className="fixed inset-0 z-[110] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl">

            <div className="p-6 border-b flex justify-between">

              <h2 className="text-xl font-black">
                Edit User
              </h2>

              <button
                onClick={() =>
                  setEditOpen(false)
                }
              >
                <X size={19} />
              </button>

            </div>

            <div className="p-6 space-y-4">

              <input
                value={editName}
                onChange={(e) =>
                  setEditName(
                    e.target.value
                  )
                }
                className="w-full bg-slate-50 border rounded-xl px-4 py-3"
              />

              <select
                value={editRole}
                onChange={(e) =>
                  setEditRole(
                    e.target.value
                  )
                }
                className="w-full bg-slate-50 border rounded-xl px-4 py-3"
              >
                <option value="admin">
                  Admin
                </option>
                <option value="engineer">
                  Engineer
                </option>
                <option value="viewer">
                  Viewer
                </option>
              </select>

            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">

              <button
                onClick={() =>
                  setEditOpen(false)
                }
                className="px-5 py-2.5 border rounded-xl font-bold"
              >
                Cancel
              </button>

              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </div>

        </div>
      )}

      {resetOpen && selectedUser && (
        <div className="fixed inset-0 z-[120] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl">

            <div className="p-6 border-b flex justify-between">

              <div>
                <h2 className="text-xl font-black">
                  Reset Password
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {selectedUser.email}
                </p>
              </div>

              <button
                onClick={() =>
                  setResetOpen(false)
                }
              >
                <X size={19} />
              </button>

            </div>

            <div className="p-6">

              <input
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                placeholder="New password"
                minLength={6}
                className="w-full bg-slate-50 border rounded-xl px-4 py-3"
              />

              <p className="text-xs text-slate-500 mt-2">
                Minimum 6 characters.
              </p>

            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">

              <button
                onClick={() =>
                  setResetOpen(false)
                }
                className="px-5 py-2.5 border rounded-xl font-bold"
              >
                Cancel
              </button>

              <button
                onClick={resetPassword}
                disabled={
                  saving ||
                  newPassword.length < 6
                }
                className="px-5 py-2.5 bg-amber-600 disabled:bg-slate-400 text-white rounded-xl font-black"
              >
                {saving
                  ? "Updating..."
                  : "Reset Password"}
              </button>

            </div>

          </div>

        </div>
      )}

      {deleteOpen && selectedUser && (
        <div className="fixed inset-0 z-[130] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl">

            <div className="p-6 border-b border-slate-200 flex justify-between">

              <div>
                <div className="w-12 h-12 bg-red-50 text-red-700 rounded-xl flex items-center justify-center">
                  <Trash2 size={22} />
                </div>

                <h2 className="text-xl font-black mt-4">
                  Delete User?
                </h2>
              </div>

              <button
                onClick={() =>
                  setDeleteOpen(false)
                }
              >
                <X size={19} />
              </button>

            </div>

            <div className="p-6">

              <p className="text-slate-600">
                You are about to permanently delete:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4">
                <p className="font-black">
                  {selectedUser.full_name || "Unnamed User"}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  {selectedUser.email}
                </p>

                <p className="text-sm font-bold text-slate-500 capitalize mt-2">
                  {selectedUser.role}
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mt-4 text-sm">
                This action cannot be undone.
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

              <button
                onClick={() =>
                  setDeleteOpen(false)
                }
                disabled={saving}
                className="px-5 py-2.5 border rounded-xl font-bold"
              >
                Cancel
              </button>

              <button
                onClick={deleteUser}
                disabled={saving}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-xl font-black"
              >
                {saving
                  ? "Deleting..."
                  : "Delete User"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}

