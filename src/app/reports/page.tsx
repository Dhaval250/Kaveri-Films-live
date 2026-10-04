"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  Search,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  FileDown,
  Users,
  Package,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  downloadCsv,
  downloadExcel,
  downloadPdf,
  formatDateExport,
} from "@/lib/export";

type Tab = "overview" | "clients" | "products";

const statusStyle: Record<string, string> = {
  "Ready for Production": "bg-blue-100 text-blue-800",
  "In Progress": "bg-amber-100 text-amber-800",
  "Partially Completed": "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  "On Hold": "bg-orange-100 text-orange-800",
  Cancelled: "bg-red-100 text-red-800",
  Planned: "bg-slate-100 text-slate-700",
};

const PLAN_HEADERS = [
  "Planning Number",
  "Client Name",
  "Product",
  "Weight (kg)",
  "Client Weight (kg)",
  "Length (m)",
  "Scrap %",
  "Status",
  "Date",
  "Assignments",
];

const CLIENT_HEADERS = [
  "Client Name",
  "Plans",
  "Allocations",
  "Total Weight (kg)",
  "Total Length (m)",
  "Last Plan Date",
];

const PRODUCT_HEADERS = [
  "Product",
  "Plans",
  "Completed",
  "Total Weight (kg)",
  "Total Length (m)",
  "Avg Scrap %",
  "Last Plan Date",
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [list, setList] = useState<any[]>([]);
  const [byClient, setByClient] = useState<any[]>([]);
  const [byProduct, setByProduct] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
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
      const res = await fetch(`/api/reports?${qs}`);
      const data = await res.json();
      setList(data.plans || []);
      setByClient(data.byClient || []);
      setByProduct(data.byProduct || []);
      setSummary(data.summary || {});
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

  const planRows = () =>
    list.map((p) => [
      p.planning_number,
      p.client_names || "—",
      p.product_name,
      Number(p.weight_kg).toFixed(2),
      Number(p.client_weight_kg || 0).toFixed(2),
      Number(p.net_length_m || p.calculated_length).toFixed(2),
      `${Number(p.scrap_percentage || 0).toFixed(2)}%`,
      p.status,
      formatDateExport(p.plan_date),
      p.assignment_count ?? 0,
    ]);

  const clientRows = () =>
    byClient.map((c) => [
      c.client_name,
      c.plan_count,
      c.allocation_count,
      Number(c.total_weight_kg).toFixed(2),
      Number(c.total_length_m).toFixed(2),
      formatDateExport(c.last_plan_date),
    ]);

  const productRows = () =>
    byProduct.map((p) => [
      p.product_name,
      p.plan_count,
      p.completed_count,
      Number(p.total_weight_kg).toFixed(2),
      Number(p.total_length_m).toFixed(2),
      `${Number(p.avg_scrap_pct || 0).toFixed(2)}%`,
      formatDateExport(p.last_plan_date),
    ]);

  const summaryCards = [
    { label: "Total Plans", value: summary.totalPlans ?? 0 },
    { label: "Total Weight (kg)", value: Number(summary.totalWeight || 0).toFixed(2) },
    {
      label: "Client Allocated (kg)",
      value: Number(summary.totalClientWeight || 0).toFixed(2),
    },
    { label: "Total Length (m)", value: Number(summary.totalLength || 0).toFixed(2) },
    { label: "Completed", value: summary.completed ?? 0 },
    { label: "Avg Scrap %", value: `${Number(summary.avgScrap || 0).toFixed(2)}%` },
  ];

  const doExport = (fmt: "csv" | "excel" | "pdf") => {
    let headers = PLAN_HEADERS;
    let rows = planRows();
    let title = "CRM Production Overview";
    if (tab === "clients") {
      headers = CLIENT_HEADERS;
      rows = clientRows();
      title = "CRM Report — By Client";
    } else if (tab === "products") {
      headers = PRODUCT_HEADERS;
      rows = productRows();
      title = "CRM Report — By Product";
    }
    const name = `kaveri_crm_${tab}_${Date.now()}`;
    if (fmt === "csv") downloadCsv(name, headers, rows);
    else if (fmt === "excel") downloadExcel(name, title, headers, rows);
    else downloadPdf(title, headers, rows, summaryCards);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">CRM Reports</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => doExport("csv")}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-slate-50"
          >
            <FileText className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => doExport("excel")}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => doExport("pdf")}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-red-50 text-red-700 border-red-200"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border p-4">
            <div className="text-xl font-bold text-slate-900">{c.value}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: "overview" as Tab, label: "Overview", icon: ClipboardList },
          { id: "clients" as Tab, label: "By Client", icon: Users },
          { id: "products" as Tab, label: "By Product", icon: Package },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px",
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Filters (overview) */}
      {tab === "overview" && (
        <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-end">
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
            <label className="text-xs text-slate-500">Product</label>
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
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-slate-500">Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                placeholder="P_2026..."
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
      )}

      <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
        <div className="overflow-x-auto">
          {tab === "overview" && (
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  {PLAN_HEADERS.map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                      <span className="inline-flex items-center gap-2 justify-center w-full py-6"><span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Loading…</span>
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                      No data
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
                      <td className="px-4 py-3">{Number(p.weight_kg).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {Number(p.client_weight_kg || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {Number(p.net_length_m || p.calculated_length).toFixed(2)}
                      </td>
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
                      <td className="px-4 py-3">{formatDateExport(p.plan_date)}</td>
                      <td className="px-4 py-3">{p.assignment_count ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === "clients" && (
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  {CLIENT_HEADERS.map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      <span className="inline-flex items-center gap-2 justify-center w-full py-6"><span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Loading…</span>
                    </td>
                  </tr>
                ) : byClient.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      No client data
                    </td>
                  </tr>
                ) : (
                  byClient.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{c.client_name}</td>
                      <td className="px-4 py-3">{c.plan_count}</td>
                      <td className="px-4 py-3">{c.allocation_count}</td>
                      <td className="px-4 py-3">
                        {Number(c.total_weight_kg).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {Number(c.total_length_m).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDateExport(c.last_plan_date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === "products" && (
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  {PRODUCT_HEADERS.map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      <span className="inline-flex items-center gap-2 justify-center w-full py-6"><span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Loading…</span>
                    </td>
                  </tr>
                ) : byProduct.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      No product data
                    </td>
                  </tr>
                ) : (
                  byProduct.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{p.product_name}</td>
                      <td className="px-4 py-3">{p.plan_count}</td>
                      <td className="px-4 py-3">{p.completed_count}</td>
                      <td className="px-4 py-3">
                        {Number(p.total_weight_kg).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {Number(p.total_length_m).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {Number(p.avg_scrap_pct || 0).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3">
                        {formatDateExport(p.last_plan_date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-3 border-t text-xs text-slate-500 flex justify-between">
          <span>
            {tab === "overview" && `Plans: ${list.length}`}
            {tab === "clients" && `Clients: ${byClient.length}`}
            {tab === "products" && `Products: ${byProduct.length}`}
          </span>
          <span className="flex gap-3">
            <button onClick={() => doExport("csv")} className="text-blue-600 hover:underline">
              CSV
            </button>
            <button
              onClick={() => doExport("excel")}
              className="text-emerald-600 hover:underline"
            >
              Excel
            </button>
            <button onClick={() => doExport("pdf")} className="text-red-600 hover:underline">
              PDF
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
