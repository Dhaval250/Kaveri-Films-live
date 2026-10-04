"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Users,
  Pencil,
  X,
  Check,
  Eye,
  EyeOff,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: number;
  created_at?: string;
};

const DEFAULT_ROLES = ["Super Admin", "Admin", "Shift Manager", "Operator"];
const PAGE_SIZE = 10;

function roleBadge(role: string) {
  const r = (role || "").toLowerCase();
  if (r.includes("super")) return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
  if (r.includes("shift")) return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  if (r.includes("admin")) return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
  if (r.includes("operator")) return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

export default function UsersPage() {
  const [list, setList] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState<UserRow | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Operator",
  });
  const [showPass, setShowPass] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
  });
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setList(data.users || []);
      if (data.roles?.length) setRoles(data.roles);
    } catch (e: any) {
      setError(e.message);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return list;
    const q = searchQ.toLowerCase();
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        (Number(u.is_active) ? "active" : "inactive").includes(q)
    );
  }, [list, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [searchQ]);

  const openCreate = () => {
    setForm({ name: "", email: "", password: "", role: "Operator" });
    setShowPass(false);
    setError("");
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setError("");
  };

  const create = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Name, email and password are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setForm({ name: "", email: "", password: "", role: "Operator" });
      setShowCreate(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: UserRow) => {
    setEditId(u.id);
    setEdit({ name: u.name, email: u.email, role: u.role, password: "" });
    setShowPass(false);
    setError("");
    setShowEdit(true);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEditId(null);
    setError("");
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    setError("");
    try {
      const body: any = {
        id: editId,
        name: edit.name.trim(),
        email: edit.email.trim(),
        role: edit.role,
      };
      if (edit.password) body.password = edit.password;
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      closeEdit();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: UserRow) => {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, is_active: !Number(u.is_active) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed");
      return;
    }
    await load();
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </span>
            Users
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-10">Manage system users and roles</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search name, email, role..."
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create User
          </button>
        </div>
      </div>

      {error && !showCreate && !showEdit && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-800">
            User List ({filtered.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-slate-500 text-left">
                <th className="px-5 py-3 font-medium w-14 border border-slate-200">#</th>
                <th className="px-5 py-3 font-medium border border-slate-200">Name</th>
                <th className="px-5 py-3 font-medium border border-slate-200">Email</th>
                <th className="px-5 py-3 font-medium border border-slate-200">Role</th>
                <th className="px-5 py-3 font-medium border border-slate-200">Status</th>
                <th className="px-5 py-3 font-medium text-center w-28 border border-slate-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </span>
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                pageItems.map((u, i) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-3.5 text-slate-500 border border-slate-200">
                      {(currentPage - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800 border border-slate-200">{u.name}</td>
                    <td className="px-5 py-3.5 text-slate-600 border border-slate-200">{u.email}</td>
                    <td className="px-5 py-3.5 border border-slate-200">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className="inline-flex items-center gap-2.5"
                        title={Number(u.is_active) ? "Deactivate" : "Activate"}
                      >
                        <span
                          className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors ${
                            Number(u.is_active) ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
                              Number(u.is_active) ? "translate-x-[18px]" : "translate-x-0"
                            }`}
                          />
                        </span>
                        <span
                          className={`text-sm ${
                            Number(u.is_active) ? "text-slate-700" : "text-slate-400"
                          }`}
                        >
                          {Number(u.is_active) ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 border border-slate-200">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowView(u)}
                          className="text-slate-500 hover:text-slate-700 transition-colors"
                          title="View"
                        >
                          <Eye className="w-[18px] h-[18px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-[18px] h-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-3 text-sm text-slate-500">
            <span>
              Showing {from} - {to} of {filtered.length} users
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`min-w-[28px] h-7 rounded text-sm font-medium ${
                    n === currentPage
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View modal */}
      {showView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">User Details</h2>
              <button
                type="button"
                onClick={() => setShowView(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Name</span>
                <span className="font-medium text-slate-800">{showView.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-800">{showView.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Role</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge(showView.role)}`}>
                  {showView.role}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Status</span>
                <span className={Number(showView.is_active) ? "text-emerald-600" : "text-slate-400"}>
                  {Number(showView.is_active) ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="flex justify-end px-5 py-3.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowView(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Create User</h2>
              <button type="button" onClick={closeCreate} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="user@kaveri.com"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Password"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-100">
              <button type="button" onClick={closeCreate} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={create}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Edit User</h2>
              <button type="button" onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
                  <input
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                  <input
                    type="email"
                    value={edit.email}
                    onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">New password</label>
                  <input
                    type="password"
                    value={edit.password}
                    onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                    placeholder="Leave blank to keep"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Role *</label>
                  <select
                    value={edit.role}
                    onChange={(e) => setEdit({ ...edit, role: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-100">
              <button type="button" onClick={closeEdit} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? "Saving..." : "Update User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
