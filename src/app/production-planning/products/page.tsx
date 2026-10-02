"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Package, Pencil, X, Check, Search, ChevronLeft, ChevronRight } from "lucide-react";

type Product = {
  id: number;
  name: string;
  density?: number;
  is_active: number;
  created_at?: string;
};

function formatDensity(v: number | string | undefined | null) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.0000";
  return n.toFixed(4);
}

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const [list, setList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDensity, setFormDensity] = useState("0");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setList(data.products || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredList = useMemo(() => {
    if (!searchQ.trim()) return list;
    const q = searchQ.toLowerCase();
    return list.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        formatDensity(p.density).includes(q) ||
        (Number(p.is_active) ? "active" : "inactive").includes(q)
    );
  }, [list, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = filteredList.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filteredList.length);

  useEffect(() => {
    setPage(1);
  }, [searchQ]);

  const openAdd = () => {
    setModalMode("add");
    setEditId(null);
    setFormName("");
    setFormDensity("0");
    setError("");
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setModalMode("edit");
    setEditId(p.id);
    setFormName(p.name);
    setFormDensity(formatDensity(p.density ?? 0));
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
  };

  const onDensityChange = (raw: string) => {
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) setFormDensity(raw);
  };

  const save = async () => {
    setError("");
    if (!formName.trim()) {
      setError("Product Name is required");
      return;
    }
    const den = parseFloat(formDensity);
    if (!Number.isFinite(den) || den < 0) {
      setError("Density (g/cc) must be 0 or greater");
      return;
    }
    setSaving(true);
    try {
      const body =
        modalMode === "add"
          ? { name: formName.trim(), density: den }
          : { id: editId, name: formName.trim(), density: den };
      const res = await fetch("/api/products", {
        method: modalMode === "add" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      closeModal();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Permanently delete this product? This cannot be undone.")) return;
    const res = await fetch(`/api/products?id=${id}&hard=1`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Could not delete product");
      return;
    }
    await load();
  };

  const toggle = async (p: Product) => {
    await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
    });
    await load();
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </span>
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-10">Manage your product details</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search product name or density..."
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </button>
        </div>
      </div>

      {/* Card — outer border only (matches screenshot) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-800">
            Product List ({filteredList.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-slate-500 text-left">
                <th className="px-5 py-3 font-medium w-14 border-b border-slate-200">#</th>
                <th className="px-5 py-3 font-medium border-b border-slate-200">Product Name</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap border-b border-slate-200">
                  Density (g/cc)
                </th>
                <th className="px-5 py-3 font-medium border-b border-slate-200">Status</th>
                <th className="px-5 py-3 font-medium text-center w-28 border-b border-slate-200">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </span>
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    {list.length === 0
                      ? 'No products yet. Click "Add New Product".'
                      : "No products match your search."}
                  </td>
                </tr>
              ) : (
                pageItems.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-3.5 text-slate-500">
                      {(currentPage - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{p.name}</td>
                    <td className="px-5 py-3.5 tabular-nums text-slate-600">
                      {formatDensity(p.density)}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => toggle(p)}
                        className="inline-flex items-center gap-2.5"
                        title={p.is_active ? "Deactivate" : "Activate"}
                      >
                        <span
                          className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors ${
                            p.is_active ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
                              p.is_active ? "translate-x-[18px]" : "translate-x-0"
                            }`}
                          />
                        </span>
                        <span
                          className={`text-sm ${
                            p.is_active ? "text-slate-700" : "text-slate-400"
                          }`}
                        >
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-[18px] h-[18px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(p.id)}
                          className="text-red-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-[18px] h-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredList.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-3 text-sm text-slate-500">
            <span>
              Showing {from} - {to} of {filteredList.length} products
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                {modalMode === "add" ? "Add New Product" : "Edit Product"}
              </h2>
              <button type="button" onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. BOPP, PET, MET PET"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Density (g/cc) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formDensity}
                  onChange={(e) => onDensityChange(e.target.value)}
                  placeholder="0.0000"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? "Saving..." : modalMode === "add" ? "Add Product" : "Update Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
