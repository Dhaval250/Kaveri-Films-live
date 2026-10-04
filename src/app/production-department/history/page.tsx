"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, RefreshCw } from "lucide-react";

type Plan = {
  id: number;
  planning_number: string;
  department_name: string;
  product_name: string;
  client_names?: string;
  net_length_m: number;
  calculated_length: number;
  weight_kg: number;
  scrap_percentage: number;
  status: string;
  plan_date: string;
};

export default function ProductionHistoryPage() {
  const [list, setList] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production-department/list?history=1");
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Production History</h1>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Planning Number</th>
              <th className="px-4 py-3 text-left">Client Name</th>
              <th className="px-4 py-3 text-left">Product Name</th>
              <th className="px-4 py-3 text-left">Length (m)</th>
              <th className="px-4 py-3 text-left">Weight (kg)</th>
              <th className="px-4 py-3 text-left">Scrap %</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                  <span className="inline-flex items-center gap-2"><span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Loading…</span>
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  No completed plans yet
                </td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-blue-600">{p.planning_number}</td>
                  <td className="px-4 py-3">{p.client_names || "—"}</td>
                  <td className="px-4 py-3">{p.product_name}</td>
                  <td className="px-4 py-3">
                    {Number(p.net_length_m || p.calculated_length).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{Number(p.weight_kg).toFixed(2)}</td>
                  <td className="px-4 py-3">{Number(p.scrap_percentage).toFixed(2)}%</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDate(p.plan_date)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/production-department/assign/${p.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border text-xs rounded-lg hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
