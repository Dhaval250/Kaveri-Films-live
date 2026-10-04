"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import LoadingState from "@/components/LoadingState";

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function WorkHistoryDetailPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const autoPrint = search.get("print") === "1";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/operator/assignments/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!autoPrint || loading || !data) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [autoPrint, loading, data]);

  const asg = data?.assignment;
  const plan = data?.plan;
  const parties = data?.parties || [];
  const rec = data?.latestRecord || data?.records?.[0];

  const summary = useMemo(() => {
    const totalIn = Number(rec?.input_weight_kg || plan?.weight_kg || 0);
    const totalOut = Number(rec?.output_weight_kg || 0);
    const totalScrap = Math.max(0, totalIn - totalOut);
    const scrapPct = totalIn > 0 ? Math.round((totalScrap / totalIn) * 10000) / 100 : 0;
    const totalLenIn = parties.reduce((s: number, p: any) => s + Number(p.length_m || 0), 0);
    const totalLenOut = Number(rec?.actual_length_m || totalLenIn || 0);
    const scrapLen = Math.max(0, totalLenIn - totalLenOut);
    const scrapLenPct =
      totalLenIn > 0 ? Math.round((scrapLen / totalLenIn) * 10000) / 100 : 0;
    return {
      totalIn,
      totalOut,
      totalScrap,
      scrapPct,
      totalLenIn,
      totalLenOut,
      scrapLenPct: Math.max(0, scrapLenPct),
      prodWeight: Math.max(0, 100 - scrapPct),
      prodLen: Math.max(0, 100 - Math.max(0, scrapLenPct)),
    };
  }, [rec, plan, parties]);

  if (loading) return <LoadingState fullPage label="Loading work history…" />;
  if (error || !data)
    return (
      <div className="p-8 text-center text-red-600">
        {error || "Not found"}{" "}
        <Link href="/operator/history" className="text-blue-600 underline ml-2">
          Back
        </Link>
      </div>
    );

  return (
    <div className="w-full space-y-5 print:space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Work History Detail</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {plan?.planning_number || "—"} · Production report
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
          <Link
            href="/operator/history"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold">Kaveri Metallising — Work History Report</h1>
        <p className="text-sm text-slate-600">
          {plan?.planning_number} · {formatDate(asg?.start_date)}
        </p>
      </div>

      {/* Production Summary card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Production Summary</h2>
            <p className="text-xs text-slate-500">View the details submitted by operator</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              ✓ {asg?.status || rec?.status || "Submitted"}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Submitted on {formatDate(rec?.created_at || asg?.start_date)}
            </p>
          </div>
        </div>

        {/* Machine & Shift */}
        <div className="m-4 rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
          <div className="bg-sky-50 px-4 py-2 text-sm font-medium text-slate-700">
            Machine &amp; Shift Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 text-sm">
            <div className="flex border-b border-slate-100">
              <div className="w-40 px-4 py-2.5 text-slate-500 bg-slate-50/50">Machine Number</div>
              <div className="flex-1 px-4 py-2.5 font-medium">{asg?.machine_name || "—"}</div>
            </div>
            <div className="flex border-b border-slate-100">
              <div className="w-40 px-4 py-2.5 text-slate-500 bg-slate-50/50">Project Manager</div>
              <div className="flex-1 px-4 py-2.5 font-medium">{asg?.manager_name || "—"}</div>
            </div>
            <div className="flex border-b border-slate-100">
              <div className="w-40 px-4 py-2.5 text-slate-500 bg-slate-50/50">Machine Operator</div>
              <div className="flex-1 px-4 py-2.5 font-medium">{asg?.operator_name || "—"}</div>
            </div>
            <div className="flex border-b border-slate-100">
              <div className="w-40 px-4 py-2.5 text-slate-500 bg-slate-50/50">Date</div>
              <div className="flex-1 px-4 py-2.5 font-medium">{formatDate(asg?.start_date)}</div>
            </div>
            <div className="flex border-b border-slate-100 sm:border-b-0">
              <div className="w-40 px-4 py-2.5 text-slate-500 bg-slate-50/50">Shift</div>
              <div className="flex-1 px-4 py-2.5 font-medium">{asg?.shift_name || "—"}</div>
            </div>
            <div className="flex">
              <div className="w-40 px-4 py-2.5 text-slate-500 bg-slate-50/50">Timing</div>
              <div className="flex-1 px-4 py-2.5 font-medium">
                {asg?.start_time || asg?.shift_time || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Party-wise */}
        <div className="mx-4 mb-4 rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
          <div className="bg-sky-50 px-4 py-2 text-sm font-medium text-slate-700">
            Party-wise Production Details
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-medium">#</th>
                  <th className="px-4 py-2.5 font-medium">Party Name</th>
                  <th className="px-4 py-2.5 font-medium">Input Weight (kg)</th>
                  <th className="px-4 py-2.5 font-medium">Output Weight (kg)</th>
                  <th className="px-4 py-2.5 font-medium">Input Length (m)</th>
                  <th className="px-4 py-2.5 font-medium">Output Length (m)</th>
                  <th className="px-4 py-2.5 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {parties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      No party allocation
                    </td>
                  </tr>
                ) : (
                  parties.map((pa: any, i: number) => {
                    const partyIn = Number(pa.weight_kg || 0);
                    const ratio =
                      summary.totalIn > 0 ? partyIn / summary.totalIn : 1 / parties.length;
                    const outW =
                      summary.totalOut > 0
                        ? summary.totalOut * ratio
                        : partyIn;
                    const inL = Number(pa.length_m || 0);
                    const outL =
                      summary.totalLenOut > 0 && summary.totalLenIn > 0
                        ? (inL / summary.totalLenIn) * summary.totalLenOut
                        : inL;
                    return (
                      <tr key={pa.id || i} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {pa.party_name || "—"}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">{partyIn.toFixed(0)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{outW.toFixed(0)}</td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {inL.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {Number(outL).toLocaleString("en-IN", {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">—</td>
                      </tr>
                    );
                  })
                )}
                {parties.length > 0 && (
                  <tr className="bg-blue-50/60 font-semibold border-t border-slate-200">
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {parties
                        .reduce((s: number, x: any) => s + Number(x.weight_kg || 0), 0)
                        .toFixed(0)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{summary.totalOut.toFixed(0)}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {parties
                        .reduce((s: number, x: any) => s + Number(x.length_m || 0), 0)
                        .toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {summary.totalLenOut.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-2.5">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary & Calculation */}
        <div className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50/40 overflow-hidden overflow-x-auto">
          <div className="bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            Summary &amp; Calculation
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 text-sm">
            <div className="flex border-b border-emerald-100">
              <div className="flex-1 px-4 py-2.5 text-slate-600">Scrapping % by Length</div>
              <div className="px-4 py-2.5 font-semibold tabular-nums">
                {summary.scrapLenPct.toFixed(2)}%
              </div>
            </div>
            <div className="flex border-b border-emerald-100">
              <div className="flex-1 px-4 py-2.5 text-slate-600">Productivity % by Length</div>
              <div className="px-4 py-2.5 font-semibold tabular-nums">
                {summary.prodLen.toFixed(2)}%
              </div>
            </div>
            <div className="flex border-b border-emerald-100 sm:border-b-0">
              <div className="flex-1 px-4 py-2.5 text-slate-600">Scrapping % by Weight</div>
              <div className="px-4 py-2.5 font-semibold tabular-nums text-amber-700">
                {summary.scrapPct.toFixed(2)}%
              </div>
            </div>
            <div className="flex">
              <div className="flex-1 px-4 py-2.5 text-slate-600">Productivity % by Weight</div>
              <div className="px-4 py-2.5 font-semibold tabular-nums text-emerald-700">
                {summary.prodWeight.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Final Remark */}
        <div className="mx-4 mb-4 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
          <p className="text-xs font-medium text-amber-800 mb-1">Final Remark</p>
          <p className="text-sm text-slate-700">{rec?.remarks || asg?.start_remarks || "—"}</p>
        </div>
      </div>
    </div>
  );
}
