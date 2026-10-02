"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Printer, Download, Info } from "lucide-react";
import LoadingState from "@/components/LoadingState";
import { cn } from "@/lib/utils";

type Plan = {
  id: number;
  planning_number: string;
  product_name: string;
  department_name: string;
  width_mm: number;
  thickness_micron: number;
  density: number;
  weight_kg: number;
  calculated_length: number;
  scrap_width_cm: number | null;
  scrap_weight_kg: number;
  scrap_length_m: number;
  scrap_percentage: number;
  total_input_kg: number;
  total_expected_kg: number;
  waste_kg: number;
  waste_percentage: number;
  productivity_pct: number;
  net_length_m: number;
  status: string;
  plan_date: string;
};

type Party = {
  id: number;
  party_name: string;
  width_mm: number;
  weight_kg: number;
  length_m: number;
};

const statusStyle: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Planned: "bg-blue-50 text-blue-700",
  "Ready for Production": "bg-amber-100 text-amber-800",
  "In Progress": "bg-sky-50 text-sky-700",
  "Partially Completed": "bg-violet-50 text-violet-700",
  Completed: "bg-green-50 text-green-700",
  "On Hold": "bg-orange-50 text-orange-700",
  Cancelled: "bg-red-50 text-red-700",
};

export default function ViewPlanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/production-plans/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPlan(d.plan);
        setParties(d.parties || []);
        if (typeof window !== "undefined") {
          const qs = new URLSearchParams(window.location.search);
          if (qs.get("print") === "1") setTimeout(() => window.print(), 400);
        }
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (d: string) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-GB");
    } catch {
      return d;
    }
  };

  const num = (v: any, digits = 2) =>
    Number(v || 0).toLocaleString("en-IN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  const handleDownload = () => {
    if (!plan) return;
    const rows: string[][] = [
      ["Planning Number", plan.planning_number],
      ["Status", plan.status],
      ["Product", plan.product_name],
      ["Department", plan.department_name],
      ["Plan Date", formatDate(plan.plan_date)],
      ["Width (mm)", String(plan.width_mm)],
      ["Thickness (micron)", String(plan.thickness_micron)],
      ["Density (g/cc)", String(plan.density)],
      ["Weight (kg)", String(plan.weight_kg)],
      ["Calculated Length (m)", String(plan.calculated_length)],
      ["Net Length (m)", String(plan.net_length_m)],
      [],
      ["#", "Party", "Width (mm)", "Weight (kg)", "Length (m)"],
      ...parties.map((p, i) => [
        String(i + 1),
        p.party_name,
        String(p.width_mm),
        String(p.weight_kg),
        String(p.length_m),
      ]),
      [
        "",
        "Total",
        String(parties.reduce((s, p) => s + Number(p.width_mm || 0), 0)),
        String(parties.reduce((s, p) => s + Number(p.weight_kg || 0), 0)),
        String(parties.reduce((s, p) => s + Number(p.length_m || 0), 0)),
      ],
      [],
      ["Scrap Width (mm)", String(plan.scrap_width_cm ?? 0)],
      ["Waste Weight (kg)", String(plan.waste_kg || plan.scrap_weight_kg)],
      ["Waste Length (m)", String(plan.scrap_length_m)],
      ["Waste %", String(plan.waste_percentage || plan.scrap_percentage)],
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.planning_number || "plan"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <LoadingState fullPage label="Loading…" />;
  }
  if (error || !plan) {
    return (
      <div className="w-full py-20 text-center text-red-600 text-sm">
        {error || "Plan not found"}
      </div>
    );
  }

  const totalW = parties.reduce((s, p) => s + Number(p.width_mm || 0), 0);
  const totalKg = parties.reduce((s, p) => s + Number(p.weight_kg || 0), 0);
  const totalL = parties.reduce((s, p) => s + Number(p.length_m || 0), 0);
  const rowSpan = Math.max(parties.length, 1);
  const scrapWidth = Number(plan.scrap_width_cm ?? 0);
  const scrapKg = Number(plan.waste_kg || plan.scrap_weight_kg || 0);

  return (
    <div className="w-full space-y-5 pb-8">
      {/* Print-only header */}
      <div className="hidden print:block mb-3 border-b border-slate-300 pb-2">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-slate-500">Kaveri Metallising</p>
            <h1 className="text-base font-bold text-slate-900">
              Production Planning — {plan.planning_number}
            </h1>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div>{plan.status}</div>
            <div>{formatDate(plan.plan_date)}</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Production Planning &amp; Assignment
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View planning details and party allocation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex px-3 py-1 rounded-full text-xs font-medium",
              statusStyle[plan.status] || "bg-slate-100 text-slate-600"
            )}
          >
            {plan.status}
          </span>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          <Link
            href={`/production-planning/edit/${plan.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="w-4 h-4" /> Edit
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* 1. Planning Details */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-blue-700">
            Planning Details
          </h2>
          <span className="text-sm text-slate-500">
            Planning No:{" "}
            <span className="font-semibold text-blue-600">
              {plan.planning_number}
            </span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-4 py-2.5 text-left font-medium">Product Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Department</th>
                <th className="px-4 py-2.5 text-left font-medium">Micron (µ)</th>
                <th className="px-4 py-2.5 text-left font-medium">Jumbo Width (mm)</th>
                <th className="px-4 py-2.5 text-left font-medium">Planned Weight (kg)</th>
                <th className="px-4 py-2.5 text-left font-medium">Planned Length (m)</th>
                <th className="px-4 py-2.5 text-left font-medium">Final Scrap %</th>
                <th className="px-4 py-2.5 text-left font-medium">Final Scrap Weight (kg)</th>
                <th className="px-4 py-2.5 text-left font-medium">Planning Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {plan.product_name}
                </td>
                <td className="px-4 py-3 text-slate-700">{plan.department_name}</td>
                <td className="px-4 py-3 text-slate-700">
                  {num(plan.thickness_micron)}
                </td>
                <td className="px-4 py-3 text-slate-700">{num(plan.width_mm)}</td>
                <td className="px-4 py-3 text-slate-700">{num(plan.weight_kg, 3)}</td>
                <td className="px-4 py-3 text-slate-700">
                  {num(plan.net_length_m || plan.calculated_length)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {num(plan.waste_percentage || plan.scrap_percentage, 4)}%
                </td>
                <td className="px-4 py-3 text-slate-700">{num(scrapKg, 3)}</td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDate(plan.plan_date)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Client / Party Allocation — same style as assignment page */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-blue-700">
            Client / Party Allocation
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50/70 text-slate-600 text-[11px] uppercase tracking-wide">
                <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">
                  #
                </th>
                <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">
                  Product Name
                </th>
                <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">
                  Mic (µ)
                </th>
                <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">
                  Jumbo Width (mm)
                </th>
                <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">
                  Weight (kg)
                </th>
                <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">
                  Party Name
                </th>
                <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">
                  Width (mm)
                </th>
                <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">
                  Weight (kg)
                </th>
                <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">
                  Length (m)
                </th>
              </tr>
            </thead>
            <tbody>
              {parties.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No party allocation
                  </td>
                </tr>
              ) : (
                parties.map((party, idx) => (
                  <tr key={party.id} className="border-b border-slate-100">
                    {idx === 0 && (
                      <>
                        <td
                          rowSpan={rowSpan}
                          className="px-3 py-3 text-slate-500 align-middle border-r border-slate-100"
                        >
                          1
                        </td>
                        <td
                          rowSpan={rowSpan}
                          className="px-3 py-3 font-semibold text-slate-800 align-middle border-r border-slate-100"
                        >
                          {plan.product_name}
                        </td>
                        <td
                          rowSpan={rowSpan}
                          className="px-3 py-3 text-slate-700 align-middle border-r border-slate-100"
                        >
                          {num(plan.thickness_micron, 0)}
                        </td>
                        <td
                          rowSpan={rowSpan}
                          className="px-3 py-3 text-slate-700 align-middle border-r border-slate-100"
                        >
                          {num(plan.width_mm, 0)}
                        </td>
                        <td
                          rowSpan={rowSpan}
                          className="px-3 py-3 text-slate-700 align-middle border-r border-slate-100"
                        >
                          {num(plan.weight_kg, 0)}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2.5 text-slate-800">
                      {party.party_name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 tabular-nums">
                      {num(party.width_mm, 0)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 tabular-nums">
                      {num(party.weight_kg, 0)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 tabular-nums">
                      {num(party.length_m)}
                    </td>
                  </tr>
                ))
              )}
              {parties.length > 0 && (
                <tr className="bg-blue-50/60 font-semibold">
                  <td className="px-3 py-2.5" colSpan={5} />
                  <td className="px-3 py-2.5 text-slate-800">Total</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-800">
                    {num(totalW, 0)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-800">
                    {num(totalKg, 0)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-800">
                    {num(totalL)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total scanning banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Total scanning:{" "}
          <strong>
            {num(scrapWidth, 0)} mm
          </strong>
          {" · "}
          <strong>{num(scrapKg, 0)} kg</strong>
        </span>
      </div>

      {/* 3. Process Scrapping summary */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-blue-700">
            Process Scrapping &amp; Live Calculations
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 text-sm">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">
              Scrap Width (mm)
            </p>
            <p className="font-semibold text-slate-800">{num(scrapWidth, 0)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">
              Waste Weight (kg)
            </p>
            <p className="font-semibold text-slate-800">{num(scrapKg)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">
              Waste Length (m)
            </p>
            <p className="font-semibold text-slate-800">
              {num(plan.scrap_length_m)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">
              Waste %
            </p>
            <p className="font-semibold text-slate-800">
              {num(plan.waste_percentage || plan.scrap_percentage)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">
              Total Input (kg)
            </p>
            <p className="font-semibold text-slate-800">
              {num(plan.total_input_kg || plan.weight_kg)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">
              Total Expected (kg)
            </p>
            <p className="font-semibold text-slate-800">
              {num(plan.total_expected_kg)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">
              Productivity %
            </p>
            <p className="font-semibold text-slate-800">
              {num(plan.productivity_pct)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">
              Net Length (m)
            </p>
            <p className="font-semibold text-blue-600">
              {num(plan.net_length_m || plan.calculated_length)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
