"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Printer,
  Download,
  Search,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: number;
  planning_number: string;
  product_name: string;
  client_names?: string;
  department_name?: string;
  machine_name: string;
  shift_name: string;
  start_date: string;
  status: string;
  production_plan_id?: number;
  planned_weight_kg?: number;
  planned_length_m?: number;
};

const statusStyle: Record<string, string> = {
  Submitted: "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  "In Progress": "bg-amber-100 text-amber-800",
  "On Hold": "bg-orange-100 text-orange-800",
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

export default function WorkHistoryPage() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [parties, setParties] = useState<{ id: number; name: string }[]>([]);
  const [machines, setMachines] = useState<{ id: number; name: string }[]>([]);
  const [shifts, setShifts] = useState<{ id: number; name: string }[]>([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    client: "",
    product: "",
    machine: "",
    shift: "",
    status: "",
    q: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ history: "1" });
      Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
      const res = await fetch(`/api/operator/assignments?${qs}`);
      const data = await res.json();
      setList(data.assignments || []);
      if (data.products) setProducts(data.products);
      if (data.parties) setParties(data.parties);
      if (data.machines) setMachines(data.machines);
      if (data.shifts) setShifts(data.shifts);
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

  const handleDownloadPdf = (a: Row) => {
    // Open Production Summary report and trigger browser Print → Save as PDF
    window.open(`/operator/history/${a.id}?print=1`, "_blank");
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Work History</h1>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

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
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[150px]"
          >
            <option value="">All Clients</option>
            {parties.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
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
            {products.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Machine</label>
          <select
            value={filters.machine}
            onChange={(e) => setFilters({ ...filters, machine: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[130px]"
          >
            <option value="">All Machines</option>
            {machines.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Shift</label>
          <select
            value={filters.shift}
            onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
            className="block mt-1 border rounded-lg px-3 py-1.5 text-sm min-w-[120px]"
          >
            <option value="">All Shifts</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
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
            <option value="Submitted">Submitted</option>
            <option value="Completed">Completed</option>
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
              client: "",
              product: "",
              machine: "",
              shift: "",
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Planning Number</th>
                <th className="px-4 py-3 text-left font-medium">Client Name</th>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Machine</th>
                <th className="px-4 py-3 text-left font-medium">Shift</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    <span className="inline-flex items-center gap-2 justify-center w-full py-6"><span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Loading…</span>
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No history yet
                  </td>
                </tr>
              ) : (
                list.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {a.planning_number}
                    </td>
                    <td className="px-4 py-3">{a.client_names || "—"}</td>
                    <td className="px-4 py-3">{a.product_name}</td>
                    <td className="px-4 py-3">{a.machine_name}</td>
                    <td className="px-4 py-3">{a.shift_name}</td>
                    <td className="px-4 py-3">{formatDate(a.start_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium",
                          statusStyle[a.status] || "bg-slate-100 text-slate-600"
                        )}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/operator/history/${a.id}`}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/operator/history/${a.id}?print=1`,
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
                          onClick={() => handleDownloadPdf(a)}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                          title="Download PDF"
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
