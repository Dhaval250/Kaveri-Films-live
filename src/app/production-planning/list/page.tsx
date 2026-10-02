"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RotateCcw,
  Eye,
  Pencil,
  Printer,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = {
  id: number;
  planning_number: string;
  department_name?: string;
  product_name?: string;
  client_names?: string;
  width_mm?: number;
  calculated_length?: number;
  net_length_m?: number;
  weight_kg?: number;
  scrap_percentage?: number;
  status?: string;
  plan_date?: string;
};

const statusStyle: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Planned: "bg-blue-100 text-blue-800",
  "Ready for Production": "bg-cyan-100 text-cyan-800",
  "In Progress": "bg-amber-100 text-amber-800",
  "In Production": "bg-amber-100 text-amber-800",
  "Partially Completed": "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  "On Hold": "bg-orange-100 text-orange-800",
  Cancelled: "bg-red-100 text-red-800",
};

export default function PlanningListPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterProducts, setMasterProducts] = useState<{ id: number; name: string }[]>([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    department: "",
    product: "",
    status: "",
    q: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
      const res = await fetch(`/api/production-plans?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPlans(data.plans || []);
    } catch (e: any) {
      console.error(e);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/masters")
      .then((r) => r.json())
      .then((d) => {
        if (d.products) setMasterProducts(d.products);
      })
      .catch(() => {});
  }, []);

  // Live filter/search — table updates as you type (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString("en-GB");
    } catch {
      return d;
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Production Planning List</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            href="/production-planning/add"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add New
          </Link>
        </div>
      </div>

      {/* Filters */}
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
          <label className="text-xs text-slate-500">Product Name</label>
          <select
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[130px]"
          >
            <option value="">All Product</option>
            {masterProducts.map((pr) => (
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
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[130px]"
          >
            <option value="">All Status</option>
            <option>Draft</option>
            <option>Planned</option>
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
            setFilters({ from: "", to: "", department: "", product: "", status: "", q: "" });
            setTimeout(load, 50);
          }}
          className="px-4 py-2 border rounded-lg text-sm inline-flex items-center gap-1 hover:bg-slate-50"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Planning Number</th>
                <th className="px-4 py-3 text-left font-medium">Client Name</th>
                <th className="px-4 py-3 text-left font-medium">Product Name</th>
                <th className="px-4 py-3 text-left font-medium">Width</th>
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
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    <span className="inline-flex items-center gap-2"><span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Loading…</span>
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    No production plans found.{" "}
                    <Link href="/production-planning/add" className="text-blue-600 underline">
                      Add New
                    </Link>
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{p.planning_number}</td>
                    <td className="px-4 py-3">{p.client_names || "—"}</td>
                    <td className="px-4 py-3">{p.product_name}</td>
                    <td className="px-4 py-3">{Number(p.width_mm).toFixed(0)}</td>
                    <td className="px-4 py-3">
                      {Number(p.net_length_m || p.calculated_length).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3">{Number(p.weight_kg).toFixed(2)}</td>
                    <td className="px-4 py-3">{Number(p.scrap_percentage || 0).toFixed(2)}%</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium",
                          statusStyle[p.status || ""] || "bg-slate-100 text-slate-600"
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(p.plan_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/production-planning/view/${p.id}`}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/production-planning/edit/${p.id}`}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            window.open(
                              `/production-planning/view/${p.id}?print=1`,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/production-plans/${p.id}`);
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "Failed");
                              const plan = data.plan;
                              const parties = data.parties || [];
                              const lines = [
                                "Kaveri Metallising - Production Plan",
                                `Planning Number: ${plan.planning_number}`,
                                `Date: ${formatDate(plan.plan_date)}`,
                                `Status: ${plan.status}`,
                                `Product: ${plan.product_name}`,
                                `Department: ${plan.department_name}`,
                                `Width (mm): ${plan.width_mm}`,
                                `Thickness (micron): ${plan.thickness_micron}`,
                                `Density: ${plan.density}`,
                                `Weight (kg): ${plan.weight_kg}`,
                                `Length (m): ${plan.net_length_m || plan.calculated_length}`,
                                `Scrap %: ${plan.scrap_percentage}`,
                                "",
                                "Parties:",
                                ...parties.map(
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
                          }}
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
          Showing {plans.length} of {plans.length} entries
        </div>
      </div>
    </div>
  );
}
