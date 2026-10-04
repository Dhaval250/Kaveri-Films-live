"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Play, Eye, ArrowRight, Search, RotateCcw } from "lucide-react";

function formatDate(d: string) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d).slice(0, 10);
    return dt.toLocaleDateString("en-GB");
  } catch {
    return String(d).slice(0, 10);
  }
}

type Assignment = {
  id: number;
  planning_number: string;
  product_name: string;
  department_name: string;
  operator_name?: string;
  machine_name: string;
  shift_name: string;
  shift_time: string;
  manager_name: string;
  start_date: string;
  status: string;
  planned_weight_kg?: number;
  planned_length_m?: number;
  calculated_length?: number;
};

const statusColor: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-700",
  "In Progress": "bg-amber-100 text-amber-800",
  Submitted: "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  "On Hold": "bg-red-100 text-red-800",
};

export default function MyAssignmentsPage() {
  const [list, setList] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    total: 0,
    progress: 0,
    submitted: 0,
    completed: 0,
    hold: 0,
  });
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
      const res = await fetch(`/api/operator/assignments?${qs}`);
      const data = await res.json();
      setList(data.assignments || []);
      setCounts(data.counts || counts);
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

  const actionBtn = (a: Assignment) => {
    if (a.status === "Not Started") {
      return (
        <Link
          href={`/operator/start/${a.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
        >
          <Play className="w-3.5 h-3.5" /> Start Work
        </Link>
      );
    }
    if (a.status === "In Progress") {
      return (
        <Link
          href={`/operator/production/${a.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
        >
          <ArrowRight className="w-3.5 h-3.5" /> Continue Work
        </Link>
      );
    }
    return (
      <Link
        href={`/operator/production/${a.id}?view=1`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
      >
        <Eye className="w-3.5 h-3.5" /> View Details
      </Link>
    );
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">My Assignments</h1>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Assigned", value: counts.total, color: "border-blue-200" },
          { label: "In Progress", value: counts.progress, color: "border-amber-200" },
          { label: "Submitted", value: counts.submitted, color: "border-purple-200" },
          { label: "Completed", value: counts.completed, color: "border-green-200" },
          { label: "On Hold", value: counts.hold, color: "border-red-200" },
        ].map((c) => (
          <div key={c.label} className={`bg-white rounded-xl border ${c.color} p-4`}>
            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
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
          <label className="text-xs text-slate-500">Department</label>
          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[130px]"
          >
            <option value="">All Department</option>
            <option value="Slitting">Slitting</option>
            <option value="Coating">Coating</option>
            <option value="Lamination">Lamination</option>
            <option value="Metallizing">Metallizing</option>
            <option value="Printing">Printing</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Product Name</label>
          <select
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[120px]"
          >
            <option value="">All Product</option>
            <option value="BOPP">BOPP</option>
            <option value="PET">PET</option>
            <option value="MET PET">MET PET</option>
            <option value="CPP">CPP</option>
            <option value="BOPET">BOPET</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[120px]"
          >
            <option value="">All Status</option>
            <option>Not Started</option>
            <option>In Progress</option>
            <option>Submitted</option>
            <option>Completed</option>
            <option>On Hold</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
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
              department: "",
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Planning Number</th>
                <th className="px-4 py-3 text-left font-medium">Product Name</th>
                <th className="px-4 py-3 text-left font-medium">Department</th>
                <th className="px-4 py-3 text-left font-medium">Operator Name</th>
                <th className="px-4 py-3 text-left font-medium">Machine Name</th>
                <th className="px-4 py-3 text-left font-medium">Shift</th>
                <th className="px-4 py-3 text-left font-medium">Shift Manager</th>
                <th className="px-4 py-3 text-left font-medium">Planned Weight (kg)</th>
                <th className="px-4 py-3 text-left font-medium">Planned Length (m)</th>
                <th className="px-4 py-3 text-left font-medium">Start Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2"><span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Loading…</span>
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                    No assignments found
                  </td>
                </tr>
              ) : (
                list.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {a.planning_number}
                    </td>
                    <td className="px-4 py-3">{a.product_name}</td>
                    <td className="px-4 py-3">{a.department_name}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {a.operator_name || "—"}
                    </td>
                    <td className="px-4 py-3">{a.machine_name}</td>
                    <td className="px-4 py-3">
                      <div>{a.shift_name}</div>
                      <div className="text-xs text-slate-400">{a.shift_time}</div>
                    </td>
                    <td className="px-4 py-3">{a.manager_name}</td>
                    <td className="px-4 py-3">
                      {Number(a.planned_weight_kg || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {Number(
                        a.planned_length_m || a.calculated_length || 0
                      ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">{formatDate(a.start_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusColor[a.status] || "bg-slate-100"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{actionBtn(a)}</td>
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
