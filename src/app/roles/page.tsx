"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Shield,
  Pencil,
  Trash2,
  X,
  Check,
  Eye,
  Lock,
} from "lucide-react";

type Module = { key: string; label: string };
type RoleRow = {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  is_system: number;
  is_active: number;
};

type ModalMode = "create" | "edit" | "view" | null;

export default function RolesPage() {
  const [list, setList] = useState<RoleRow[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState<ModalMode>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setList(data.roles || []);
      setModules(data.modules || []);
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

  const openCreate = () => {
    setForm({ name: "", description: "", permissions: [] });
    setEditId(null);
    setModal("create");
    setError("");
  };

  const openEdit = (r: RoleRow) => {
    setEditId(r.id);
    setForm({
      name: r.name,
      description: r.description || "",
      permissions: [...(r.permissions || [])],
    });
    setModal("edit");
    setError("");
  };

  const openView = (r: RoleRow) => {
    setEditId(r.id);
    setForm({
      name: r.name,
      description: r.description || "",
      permissions: [...(r.permissions || [])],
    });
    setModal("view");
    setError("");
  };

  const closeModal = () => {
    setModal(null);
    setEditId(null);
    setError("");
  };

  const togglePerm = (key: string) => {
    if (modal === "view") return;
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((k) => k !== key)
        : [...f.permissions, key],
    }));
  };

  const selectAll = () => {
    if (modal === "view") return;
    setForm((f) => ({ ...f, permissions: modules.map((m) => m.key) }));
  };

  const clearAll = () => {
    if (modal === "view") return;
    setForm((f) => ({ ...f, permissions: [] }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("Role name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (modal === "create") {
        const res = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
      } else if (modal === "edit" && editId) {
        const res = await fetch("/api/roles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, ...form }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
      }
      closeModal();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this role? Users with this role may lose access.")) return;
    const res = await fetch(`/api/roles?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    await load();
  };

  const currentRole = editId ? list.find((r) => r.id === editId) : null;
  const isSystemEdit = modal === "edit" && currentRole?.is_system;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" /> Roles & Access
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage roles and module permissions for users
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Role
          </button>
        </div>
      </div>

      {error && !modal && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Role cards / table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
          <span className="font-medium text-slate-800">All Roles</span>
          <span className="text-xs text-slate-500">{list.length} roles</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Role Name</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Permissions</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Loading roles...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No roles yet. Click Add Role to create one.
                  </td>
                </tr>
              ) : (
                list.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{r.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {r.description || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {(r.permissions || []).slice(0, 4).map((k) => {
                          const label =
                            modules.find((m) => m.key === k)?.label || k;
                          return (
                            <span
                              key={k}
                              className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100"
                            >
                              {label}
                            </span>
                          );
                        })}
                        {(r.permissions || []).length > 4 && (
                          <span className="text-[10px] text-slate-500 px-1">
                            +{(r.permissions || []).length - 4} more
                          </span>
                        )}
                        {(r.permissions || []).length === 0 && (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.is_system ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> System
                        </span>
                      ) : (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openView(r)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!r.is_system && (
                          <button
                            onClick={() => remove(r.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit / View */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col overflow-x-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  {modal === "create" && "Add New Role"}
                  {modal === "edit" && "Edit Role"}
                  {modal === "view" && "View Role"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={modal === "view" || !!isSystemEdit}
                    className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm disabled:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Quality Manager"
                  />
                  {isSystemEdit && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      System role name cannot be changed
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Description
                  </label>
                  <input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    disabled={modal === "view"}
                    className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm disabled:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Short description"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-slate-600">
                    Module Access ({form.permissions.length}/{modules.length})
                  </label>
                  {modal !== "view" && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {modules.map((m) => {
                    const checked = form.permissions.includes(m.key);
                    return (
                      <label
                        key={m.key}
                        className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2.5 cursor-pointer border transition-colors ${
                          checked
                            ? "bg-blue-50 border-blue-200 text-blue-900"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                        } ${modal === "view" ? "cursor-default" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePerm(m.key)}
                          disabled={modal === "view"}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-white"
              >
                {modal === "view" ? "Close" : "Cancel"}
              </button>
              {modal !== "view" && (
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving
                    ? "Saving..."
                    : modal === "create"
                    ? "Create Role"
                    : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
