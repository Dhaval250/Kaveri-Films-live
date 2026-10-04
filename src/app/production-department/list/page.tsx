"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Play,
  Eye,
  Pencil,
  Printer,
  Download,
  Search,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = {
  id: number;
  planning_number: string;
  department_name: string;
  product_name: string;
  client_names?: string;
  calculated_length: number;
  net_length_m: number;
  weight_kg: number;
  scrap_percentage: number;
  status: string;
  plan_date: string;
};

const statusStyle: Record<string, string> = {
  "Ready for Production": "bg-blue-100 text-blue-800",
  "In Progress": "bg-amber-100 text-amber-800",
  "Partially Completed": "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  "On Hold": "bg-orange-100 text-orange-800",
  Cancelled: "bg-red-100 text-red-800",
  Planned: "bg-slate-100 text-slate-700",
  Draft: "bg-slate-100 text-slate-500",
};

function formatDate(d: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d).slice(0, 10);
    return dt.toLocaleDateString("en-GB");
  } catch {
    return String(d).slice(0, 10);
  }
}

export default function ProductionListPage() {
  const [list, setList] = useState<Plan[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [parties, setParties] = useState<{ id: number; name: string }[]>([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    client: "",
    product: "",
    status: "",
    q: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
      const res = await fetch(`/api/production-department/list?${qs}`);
      const data = await res.json();
      setList(data.plans || []);
      setCounts(data.counts || {});
      if (data.products) setProducts(data.products);
      if (data.parties) setParties(data.parties);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  // Live filter/search — table updates as you type (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleDownload = async (p: Plan) => {
    try {
      const res = await fetch(`/api/production-plans/${p.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const plan = data.plan;
      const partiesList = data.parties || [];
      const lines = [
        "Kaveri Metallising - Production Plan",
        `Planning Number: ${plan.planning_number}`,
        `Date: ${formatDate(plan.plan_date)}`,
        `Status: ${plan.status}`,
        `Product: ${plan.product_name}`,
        `Client: ${(partiesList as any[]).map((x) => x.party_name).join(", ") || "—"}`,
        `Width (mm): ${plan.width_mm}`,
        `Weight (kg): ${plan.weight_kg}`,
        `Length (m): ${plan.net_length_m || plan.calculated_length}`,
        `Scrap %: ${plan.scrap_percentage}`,
        "",
        "Parties:",
        ...partiesList.map(
          (pa: any, i: number) =>
            `${i + 1}. ${pa.party_name} | ${pa.width_mm} mm | ${pa.weight_kg} kg | ${pa.length_m} m`
        ),
      ];
      const blob = new Blob([lines.join("\n")], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${plan.planning_number}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "Download failed");
    }
  };

  const canStart =
    (status: string) =>
      status === "Ready for Production" ||
      status === "Planned" ||
      status === "In Progress" ||
      status === "Partially Completed";

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Production Department</h1>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { key: "ready", label: "Ready for Production", color: "border-blue-200" },
          { key: "progress", label: "In Progress", color: "border-amber-200" },
          { key: "partial", label: "Partially Completed", color: "border-purple-200" },
          { key: "completed", label: "Completed", color: "border-green-200" },
          { key: "hold", label: "On Hold", color: "border-orange-200" },
          { key: "cancelled", label: "Cancelled", color: "border-red-200" },
        ].map((c) => (
          <div key={c.key} className={`bg-white rounded-xl border ${c.color} p-4`}>
            <div className="text-2xl font-bold">{counts[c.key] ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters — Client instead of Department */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500">From Date</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">To Date</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Client Name</label>
          <select
            value={filters.client}
            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[160px]"
          >
            <option value="">All Clients</option>
            {parties.map((pt) => (
              <option key={pt.id} value={pt.name}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Product Name</label>
          <select
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[130px]"
          >
            <option value="">All Product</option>
            {products.map((pr) => (
              <option key={pr.id} value={pr.name}>
                {pr.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[150px]"
          >
            <option value="">All Status</option>
            <option>Ready for Production</option>
            <option>In Progress</option>
            <option>Partially Completed</option>
            <option>Completed</option>
            <option>On Hold</option>
            <option>Cancelled</option>
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-slate-500">Search (all fields)</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Plan no, product, client, status..."
              className="w-full border rounded-lg pl-9 pr-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Filter
        </button>
        <button
          onClick={() => {
            setFilters({
              from: "",
              to: "",
              client: "",
              product: "",
              status: "",
              q: "",
            });
            setTimeout(load, 50);
          }}
          className="px-4 py-2 border rounded-lg text-sm inline-flex items-center gap-1 hover:bg-slate-50"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Planning Number</th>
                <th className="px-4 py-3 text-left font-medium">Client Name</th>
                <th className="px-4 py-3 text-left font-medium">Product Name</th>
                <th className="px-4 py-3 text-left font-medium">Length (m)</th>
                <th className="px-4 py-3 text-left font-medium">Weight (kg)</th>
                <th className="px-4 py-3 text-left font-medium">Scrap %</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    <span className="inline-flex items-center gap-2 justify-center w-full py-6"><span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Loading…</span>
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    No plans found
                  </td>
                </tr>
              ) : (
                list.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {p.planning_number}
                    </td>
                    <td className="px-4 py-3">{p.client_names || "—"}</td>
                    <td className="px-4 py-3">{p.product_name}</td>
                    <td className="px-4 py-3">
                      {Number(p.net_length_m || p.calculated_length).toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 }
                      )}
                    </td>
                    <td className="px-4 py-3">{Number(p.weight_kg).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {Number(p.scrap_percentage || 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium",
                          statusStyle[p.status] || "bg-slate-100 text-slate-600"
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(p.plan_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {canStart(p.status) && (
                          <Link
                            href={`/production-department/assign/${p.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                            title="Start Production"
                          >
                            <Play className="w-3.5 h-3.5" /> Start Production
                          </Link>
                        )}
                        <Link
                          href={`/production-department/assign/${p.id}`}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/production-planning/view/${p.id}`}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                          title="Plan Details"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/production-planning/view/${p.id}?print=1`,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(p)}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-slate-500">
          Showing {list.length} of {list.length} entries
        </div>
      </div>
    </div>
  );
}
