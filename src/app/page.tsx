"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Package,
  Trash2,
  Gauge,
  Settings2,
  Target,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";
import LoadingState from "@/components/LoadingState";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<any>({});
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterMachine, setFilterMachine] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [shifts, setShifts] = useState<{ id: number; name: string }[]>([]);
  const [machines, setMachines] = useState<{ id: number; name: string }[]>([]);
  const [jobs, setJobs] = useState<{ id: number; name: string }[]>([]);

  const [loadError, setLoadError] = useState("");

  const buildSummary = (list: any[]) => {
    return {
      totalPlans: list.length,
      totalWeight: list.reduce((s, x) => s + Number(x.weight_kg || 0), 0),
      totalLength: list.reduce(
        (s, x) => s + Number(x.net_length_m || x.calculated_length || 0),
        0
      ),
      ready: list.filter((x) => x.status === "Ready for Production").length,
      inProgress: list.filter((x) => x.status === "In Progress").length,
      partial: list.filter((x) => x.status === "Partially Completed").length,
      completed: list.filter((x) => x.status === "Completed").length,
      onHold: list.filter((x) => x.status === "On Hold").length,
      cancelled: list.filter((x) => x.status === "Cancelled").length,
      avgScrap:
        list.length > 0
          ? list.reduce(
              (s, x) => s + Number(x.scrap_percentage || x.waste_percentage || 0),
              0
            ) / list.length
          : 0,
    };
  };

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      setUser(me.user || null);
      if (me.user?.role === "Operator") {
        window.location.href = "/operator/assignments";
        return;
      }

      // Always load plans from production-plans (reliable)
      const [activeRes, histRes] = await Promise.all([
        fetch("/api/production-plans"),
        fetch("/api/production-plans?history=1"),
      ]);
      const active = await activeRes.json();
      const hist = await histRes.json();

      if (active.error && hist.error) {
        setLoadError(active.error || hist.error || "Failed to load plans");
        setPlans([]);
        setSummary({});
        return;
      }

      let list = [...(active.plans || []), ...(hist.plans || [])];
      const seen = new Set<number>();
      list = list.filter((p: any) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      // Product / Job filter (client-side)
      if (filterJob) {
        list = list.filter(
          (p: any) =>
            String(p.product_id) === String(filterJob) ||
            String(p.product_name) ===
              String(jobs.find((j) => String(j.id) === String(filterJob))?.name || "")
        );
      }

      // Shift / Machine filters via reports when selected
      if (filterShift || filterMachine) {
        const qs = new URLSearchParams();
        if (filterShift) qs.set("shift", filterShift);
        if (filterMachine) qs.set("machine", filterMachine);
        if (filterJob) qs.set("product_id", filterJob);
        try {
          const r = await fetch(`/api/reports?${qs}`);
          const data = await r.json();
          if (r.ok && Array.isArray(data.plans)) {
            list = data.plans;
          }
        } catch {
          /* keep production-plans list */
        }
      }

      setPlans(list);
      setSummary(buildSummary(list));
      setLastUpdated(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load dashboard");
      setPlans([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/masters");
        const data = await res.json();
        setShifts(data.shifts || []);
        setMachines(data.machines || []);
        setJobs(data.products || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Auto-load on mount and when filters change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterShift, filterMachine, filterJob]);

  const metrics = useMemo(() => {
    const totalWeight = Number(summary.totalWeight || 0);
    const scrapVals = plans
      .map((p) => Number(p.scrap_percentage || p.waste_percentage || 0))
      .filter((n) => !isNaN(n));
    const avgScrap =
      scrapVals.length > 0
        ? scrapVals.reduce((a, b) => a + b, 0) / scrapVals.length
        : 0;
    const productivity = Math.max(0, 100 - avgScrap);
    return {
      totalWeight,
      avgScrap,
      productivity,
      totalPlans: summary.totalPlans ?? plans.length,
      ready: summary.ready ?? 0,
      inProgress: summary.inProgress ?? 0,
      completed: summary.completed ?? 0,
    };
  }, [summary, plans]);

  const topScrapPlans = useMemo(() => {
    return [...plans]
      .map((p) => ({
        ...p,
        scrap: Number(p.scrap_percentage || p.waste_percentage || 0),
        weight: Number(p.weight_kg || 0),
      }))
      .sort((a, b) => b.scrap - a.scrap)
      .slice(0, 5);
  }, [plans]);

  const byProduct = useMemo(() => {
    const map: Record<string, { weight: number; scrapSum: number; n: number }> =
      {};
    plans.forEach((p) => {
      const name = p.product_name || "Other";
      if (!map[name]) map[name] = { weight: 0, scrapSum: 0, n: 0 };
      map[name].weight += Number(p.weight_kg || 0);
      map[name].scrapSum += Number(p.scrap_percentage || 0);
      map[name].n += 1;
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        weight: v.weight,
        scrap: v.n ? v.scrapSum / v.n : 0,
      }))
      .sort((a, b) => b.scrap - a.scrap)
      .slice(0, 6);
  }, [plans]);

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    plans.forEach((p) => {
      const s = p.status || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [plans]);

  const maxProductScrap = Math.max(...byProduct.map((p) => p.scrap), 1);

  if (loading && !plans.length) {
    return <LoadingState fullPage label="Loading dashboard…" />;
  }

  return (
    <div className="w-full space-y-4">
      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm px-3 py-2">
          {loadError}
        </div>
      )}
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Manufacturing Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time overview of production, performance &amp; quality
            
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 min-w-[120px]"
          >
            <option value="">All Shifts</option>
            {shifts.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 min-w-[120px]"
          >
            <option value="">All Machines</option>
            {machines.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-2 min-w-[120px]"
          >
            <option value="">All Jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={String(j.id)}>
                {j.name}
              </option>
            ))}
          </select>
          {lastUpdated && (
            <span className="text-[11px] text-slate-400">
              Last Updated · {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            title: "PRODUCTION",
            value: `${metrics.totalWeight.toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })} kg`,
            sub: `${metrics.totalPlans} plans`,
            icon: Package,
            iconBg: "bg-blue-50 text-blue-600",
          },
          {
            title: "SCRAP %",
            value: `${metrics.avgScrap.toFixed(2)}%`,
            sub: "Average across plans",
            icon: Trash2,
            iconBg: "bg-red-50 text-red-600",
          },
          {
            title: "PRODUCTIVITY",
            value: `${metrics.productivity.toFixed(1)}%`,
            sub: "100 − avg scrap",
            icon: Gauge,
            iconBg: "bg-emerald-50 text-emerald-600",
          },
          {
            title: "READY",
            value: String(metrics.ready),
            sub: "Ready for Production",
            icon: Settings2,
            iconBg: "bg-violet-50 text-violet-600",
          },
          {
            title: "IN PROGRESS",
            value: String(metrics.inProgress),
            sub: "Active plans",
            icon: Target,
            iconBg: "bg-amber-50 text-amber-600",
          },
          {
            title: "COMPLETED",
            value: String(metrics.completed),
            sub: "Finished plans",
            icon: ClipboardCheck,
            iconBg: "bg-cyan-50 text-cyan-600",
          },
        ].map((k) => (
          <div
            key={k.title}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-semibold tracking-wider text-slate-400">
                {k.title}
              </p>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.iconBg}`}
              >
                <k.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
              {k.value}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <h3 className="text-xs font-semibold tracking-wide text-slate-600">
              SCRAP % BY PLAN
            </h3>
            <Link
              href="/production-planning/list"
              className="text-[11px] text-blue-600 hover:underline"
            >
              View all plans →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="px-3 py-2 text-left font-medium">Plan No.</th>
                  <th className="px-3 py-2 text-left font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Prod (kg)</th>
                  <th className="px-3 py-2 text-right font-medium">Scrap %</th>
                </tr>
              </thead>
              <tbody>
                {topScrapPlans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-slate-400"
                    >
                      No data
                    </td>
                  </tr>
                ) : (
                  topScrapPlans.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-50 hover:bg-slate-50/80"
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={`/production-planning/view/${p.id}`}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          {p.planning_number}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-600 truncate max-w-[90px]">
                        {p.product_name}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                        {p.weight.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold tabular-nums ${
                          p.scrap > 3
                            ? "text-red-600"
                            : p.scrap > 1.5
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {p.scrap.toFixed(2)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <h3 className="text-xs font-semibold tracking-wide text-slate-600">
              SCRAP % BY PRODUCT
            </h3>
          </div>
          <div className="p-4 h-[220px] flex items-end justify-around gap-2">
            {byProduct.length === 0 ? (
              <p className="text-slate-400 text-sm m-auto">No product data</p>
            ) : (
              byProduct.map((row, i) => {
                const h = Math.max(8, (row.scrap / maxProductScrap) * 160);
                const colors = [
                  "bg-emerald-500",
                  "bg-red-500",
                  "bg-amber-500",
                  "bg-emerald-400",
                  "bg-blue-500",
                  "bg-violet-500",
                ];
                return (
                  <div
                    key={row.name}
                    className="flex-1 flex flex-col items-center gap-1 max-w-[56px]"
                  >
                    <span className="text-[10px] text-slate-500 tabular-nums">
                      {row.scrap.toFixed(1)}%
                    </span>
                    <div
                      className={`w-full rounded-t-md ${colors[i % colors.length]}`}
                      style={{ height: h }}
                      title={`${row.name}: ${row.scrap.toFixed(2)}%`}
                    />
                    <span className="text-[9px] text-slate-500 truncate w-full text-center">
                      {row.name}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <h3 className="text-xs font-semibold tracking-wide text-slate-600">
              PLAN STATUS SUMMARY
            </h3>
            <Link
              href="/reports"
              className="text-[11px] text-blue-600 hover:underline"
            >
              View report →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Count</th>
                  <th className="px-3 py-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {byStatus.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-8 text-center text-slate-400"
                    >
                      No data
                    </td>
                  </tr>
                ) : (
                  byStatus.map(([status, count]) => {
                    const share =
                      metrics.totalPlans > 0
                        ? ((count / metrics.totalPlans) * 100).toFixed(1)
                        : "0";
                    return (
                      <tr
                        key={status}
                        className="border-b border-slate-50 hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-2 text-slate-700">{status}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-medium">
                          {count}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                          {share}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 min-h-[200px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold tracking-wide text-slate-600">
              PRODUCTION TREND (DAILY)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Pending
            </span>
          </div>
          <div className="h-[140px] flex items-end gap-1.5 px-1">
            {[40, 55, 48, 70, 62, 75, 68].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-blue-200 border border-blue-300"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Chart data module coming next
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 min-h-[200px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold tracking-wide text-slate-600">
              SCRAP REASONS
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Pending
            </span>
          </div>
          <div className="flex items-center justify-center h-[140px]">
            <div className="relative w-28 h-28 rounded-full border-[12px] border-slate-200 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[12px] border-transparent border-t-blue-500 border-r-red-500 border-b-amber-500 border-l-emerald-500 opacity-70" />
              <div className="text-center z-10">
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.avgScrap.toFixed(1)}%
                </p>
                <p className="text-[9px] text-slate-400">Avg Scrap</p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            Reason codes pending
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <h3 className="text-xs font-semibold tracking-wide text-slate-600">
              TOP 5 PLANS BY SCRAP %
            </h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="px-3 py-2 text-left font-medium">Plan</th>
                <th className="px-3 py-2 text-left font-medium">Client</th>
                <th className="px-3 py-2 text-right font-medium">Scrap %</th>
              </tr>
            </thead>
            <tbody>
              {topScrapPlans.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 hover:bg-slate-50/80"
                >
                  <td className="px-3 py-2 text-blue-600 font-medium">
                    {p.planning_number}
                  </td>
                  <td className="px-3 py-2 text-slate-600 truncate max-w-[100px]">
                    {p.client_names || "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold tabular-nums ${
                      p.scrap > 3 ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {p.scrap.toFixed(2)}%
                  </td>
                </tr>
              ))}
              {topScrapPlans.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-8 text-center text-slate-400"
                  >
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
