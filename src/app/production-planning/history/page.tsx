"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, RefreshCw, History } from "lucide-react";

type Plan = {
  id: number;
  planning_number: string;
  product_name: string;
  client_names?: string;
  net_length_m: number;
  calculated_length: number;
  weight_kg: number;
  scrap_percentage: number;
  status: string;
  plan_date: string;
};

export default function PlanningHistoryPage() {
  const [list, setList] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production-plans?history=1");
      const data = await res.json();
      setList(data.plans || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatDate = (d: string) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d).slice(0, 10);
      return dt.toLocaleDateString("en-GB");
    } catch {
      return String(d).slice(0, 10);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-slate-500" />
            Planning History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Completed &amp; cancelled production plans
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Planning Number</th>
                <th className="px-4 py-3 text-left">Client Name</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Length (m)</th>
                <th className="px-4 py-3 text-left">Weight (kg)</th>
                <th className="px-4 py-3 text-left">Scrap %</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </span>
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No completed plans yet
                  </td>
                </tr>
              ) : (
                list.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {p.planning_number}
                    </td>
                    <td className="px-4 py-3">{p.client_names || "—"}</td>
                    <td className="px-4 py-3">{p.product_name}</td>
                    <td className="px-4 py-3">
                      {Number(p.net_length_m || p.calculated_length || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{Number(p.weight_kg || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {Number(p.scrap_percentage || 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          p.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(p.plan_date)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/production-planning/view/${p.id}`}
                        className="inline-flex p-1.5 text-slate-600 hover:text-blue-600"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
