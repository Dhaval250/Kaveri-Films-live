"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, CheckCircle, RefreshCw, Info, Package } from "lucide-react";
import LoadingState from "@/components/LoadingState";

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

type MasterItem = { id: number; name: string; email?: string; start_time?: string; end_time?: string };

export default function AssignPage() {
  const { id } = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [managers, setManagers] = useState<MasterItem[]>([]);
  const [operators, setOperators] = useState<MasterItem[]>([]);
  const [machines, setMachines] = useState<MasterItem[]>([]);
  const [shifts, setShifts] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({
    shift_manager_id: "",
    shift_id: "",
    machine_id: "",
    operator_id: "",
    start_date: "",
    start_time: "",
    is_shift_change: false,
    previous_assignment_id: "",
    remarks: "",
  });
  const [managerRemarks, setManagerRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("In Progress");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const applyMasters = (m: any) => {
    if (!m) return;
    if (Array.isArray(m.managers) && m.managers.length) setManagers(m.managers);
    if (Array.isArray(m.operators) && m.operators.length) setOperators(m.operators);
    if (Array.isArray(m.machines) && m.machines.length) setMachines(m.machines);
    if (Array.isArray(m.shifts) && m.shifts.length) setShifts(m.shifts);
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError("");
    try {
      // Parallel fetch — assign already includes masters
      const [mRes, res] = await Promise.all([
        fetch("/api/masters"),
        fetch(`/api/production-department/assign/${id}`),
      ]);
      if (mRes.ok) {
        const mJson = await mRes.json();
        applyMasters(mJson);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load plan");

      setPlan(json.plan || null);
      setAssignments(json.assignments || []);
      setRecords(json.records || []);
      setParties(json.parties || []);
      if (json.masters) applyMasters(json.masters);
    } catch (e: any) {
      setLoadError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const summary = useMemo(() => {
    const totalIn = records.reduce((s, r) => s + Number(r.input_weight_kg || 0), 0);
    const totalOut = records.reduce((s, r) => s + Number(r.output_weight_kg || 0), 0);
    const totalScrap = records.reduce((s, r) => s + Number(r.waste_weight_kg || 0), 0);
    const scrapPct = totalIn > 0 ? Math.round((totalScrap / totalIn) * 10000) / 100 : 0;
    const totalLenIn = records.reduce((s, r) => s + Number(r.actual_length_m || 0), 0);
    const planLen = Number(plan?.net_length_m || plan?.calculated_length || 0);
    const scrapLenPct =
      planLen > 0 && totalLenIn > 0
        ? Math.round(((planLen - totalLenIn) / planLen) * 10000) / 100
        : 0;
    const prodLenPct =
      planLen > 0 && totalLenIn > 0
        ? Math.round((totalLenIn / planLen) * 10000) / 100
        : totalLenIn > 0
        ? 100
        : 0;
    const prodWtPct = totalIn > 0 ? Math.round((totalOut / totalIn) * 10000) / 100 : 0;
    return {
      totalIn,
      totalOut,
      totalScrap,
      scrapPct,
      totalLenIn,
      scrapLenPct: Math.max(0, scrapLenPct),
      prodLenPct: Math.min(100, Math.max(0, prodLenPct)),
      prodWtPct,
    };
  }, [records, plan]);

  const latestRecord = records.length ? records[records.length - 1] : null;
  const latestAssign =
    assignments.find((a: any) => a.id === latestRecord?.assignment_id) ||
    assignments[assignments.length - 1] ||
    null;

  const submitAssign = async (statusOverride?: string) => {
    if (
      !form.shift_manager_id ||
      !form.shift_id ||
      !form.machine_id ||
      !form.operator_id
    ) {
      return alert("Please fill all required fields");
    }
    const status = statusOverride || submitStatus;
    setSaving(true);
    try {
      // Start Date / Time auto — not shown in UI
      const now = new Date();
      const autoDate = now.toISOString().slice(0, 10);
      const autoTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const res = await fetch(`/api/production-department/assign/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          plan_status: status,
          ...form,
          start_date: autoDate,
          start_time: autoTime,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      await load();
      setForm({
        shift_manager_id: "",
        shift_id: "",
        machine_id: "",
        operator_id: "",
        start_date: "",
        start_time: "",
        is_shift_change: false,
        previous_assignment_id: "",
        remarks: "",
      });
      alert(`Assignment submitted · Plan status: ${status}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitFinal = async () => {
    if (!confirm("Submit final production and mark as Completed?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/production-department/assign/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "final", manager_remarks: managerRemarks }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      router.push("/production-department/list");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState fullPage label="Loading data…" />;
  }

  if (loadError || !plan) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-red-600">{loadError || "Plan not found"}</p>
        <p className="text-sm text-slate-500">
          Check MySQL is running and you imported{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">
            database/kaveri_production_planning.sql
          </code>
        </p>
        <button
          onClick={load}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const p = plan;
  const mastersEmpty =
    managers.length === 0 ||
    operators.length === 0 ||
    machines.length === 0 ||
    shifts.length === 0;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Production Planning &amp; Assignment
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View planning details and assign production resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            {p.status}
          </span>
          <Link
            href="/production-department/list"
            className="inline-flex items-center gap-2 text-sm border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </Link>
        </div>
      </div>

      {/* Planning Details — horizontal like reference */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-blue-700">Planning Details</h2>
          <span className="text-sm text-slate-500">
            Planning No:{" "}
            <span className="font-semibold text-blue-600">{p.planning_number}</span>
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
                <td className="px-4 py-3 font-semibold text-slate-800">{p.product_name}</td>
                <td className="px-4 py-3 text-slate-700">{p.department_name}</td>
                <td className="px-4 py-3 text-slate-700">
                  {Number(p.thickness_micron || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {Number(p.width_mm || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {Number(p.weight_kg || 0).toFixed(3)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {Number(p.net_length_m || p.calculated_length || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {Number(p.waste_percentage || p.scrap_percentage || 0).toFixed(4)}%
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {Number(p.waste_kg || p.scrap_weight_kg || 0).toFixed(3)}
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDate(p.plan_date)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Client / Party Allocation — product rowspan style */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-blue-700">Client / Party Allocation</h2>
        </div>
        {parties.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-400 text-center">
            No party allocation for this plan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-50/70 text-slate-600 text-[11px] uppercase tracking-wide">
                  <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">Product Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">Mic (µ)</th>
                  <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">Jumbo Width (mm)</th>
                  <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">Weight (kg)</th>
                  <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">Party Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">Width (mm)</th>
                  <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">Weight (kg)</th>
                  <th className="px-3 py-2.5 text-left font-semibold border-b border-slate-200">Length (m)</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((pa: any, i: number) => {
                  const rowSpan = parties.length;
                  return (
                    <tr key={pa.id || i} className="border-b border-slate-100">
                      {i === 0 && (
                        <>
                          <td rowSpan={rowSpan} className="px-3 py-3 text-slate-500 align-middle border-r border-slate-100">
                            1
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-3 font-semibold text-slate-800 align-middle border-r border-slate-100">
                            {p.product_name}
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-3 text-slate-700 align-middle border-r border-slate-100">
                            {Number(p.thickness_micron || 0).toFixed(0)}
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-3 text-slate-700 align-middle border-r border-slate-100">
                            {Number(p.width_mm || 0).toFixed(0)}
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-3 text-slate-700 align-middle border-r border-slate-100">
                            {Number(p.weight_kg || 0).toFixed(0)}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-slate-800">
                        {pa.party_name || pa.party_name_text || "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700">
                        {Number(pa.width_mm || 0).toFixed(0)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700">
                        {Number(pa.weight_kg || 0).toFixed(0)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700">
                        {Number(pa.length_m || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-blue-50/60 font-semibold">
                  <td className="px-3 py-2.5" colSpan={5} />
                  <td className="px-3 py-2.5 text-slate-800">Total</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {parties.reduce((s, pa) => s + Number(pa.width_mm || 0), 0).toFixed(0)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {parties.reduce((s, pa) => s + Number(pa.weight_kg || 0), 0).toFixed(0)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {parties
                      .reduce((s, pa) => s + Number(pa.length_m || 0), 0)
                      .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total scanning banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Total scanning:{" "}
          <strong>{Number(p.scrap_width_cm || 0).toFixed(0)} mm</strong>
          {" · "}
          <strong>{Number(p.waste_kg || p.scrap_weight_kg || 0).toFixed(0)} kg</strong>
        </span>
      </div>

      {/* Assignment Form */}
      {p.status !== "Completed" && p.status !== "Cancelled" && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <h2 className="font-medium">Production Assignment</h2>
            <label
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer ${
                form.is_shift_change
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <input
                type="checkbox"
                checked={form.is_shift_change}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_shift_change: e.target.checked,
                    previous_assignment_id: e.target.checked
                      ? form.previous_assignment_id
                      : "",
                  })
                }
                className="w-4 h-4 rounded"
              />
              <RefreshCw className="w-4 h-4" />
              <span className="font-medium">Shift Change</span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                (continue from previous shift)
              </span>
            </label>
          </div>

          {mastersEmpty && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 space-y-1">
              <div className="font-medium">Master data missing from database</div>
              <div>
                Managers: {managers.length} · Operators: {operators.length} · Machines:{" "}
                {machines.length} · Shifts: {shifts.length}
              </div>
              <div>
                Open phpMyAdmin → import{" "}
                <code className="bg-white px-1 rounded text-xs">
                  database/kaveri_production_planning.sql
                </code>{" "}
                then click Retry below.
              </div>
              <button
                type="button"
                onClick={load}
                className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded text-xs"
              >
                Retry load from database
              </button>
            </div>
          )}

          {form.is_shift_change && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <p className="text-sm text-amber-900">
                Continuing from a previous shift. Select previous assignment if
                available.
              </p>
              {assignments.length > 0 ? (
                <div>
                  <label className="text-xs text-slate-600 font-medium">
                    Previous Assignment
                  </label>
                  <select
                    value={form.previous_assignment_id}
                    onChange={(e) =>
                      setForm({ ...form, previous_assignment_id: e.target.value })
                    }
                    className="mt-1 w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select previous assignment</option>
                    {assignments.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        #{a.id} · {a.operator_name || "Operator"} ·{" "}
                        {a.shift_name || "Shift"} · {formatDate(a.start_date)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-amber-800">
                  No previous assignments found for this plan.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-500">
                Shift Manager *{" "}
                <span className="text-slate-400">({managers.length})</span>
              </label>
              <select
                value={form.shift_manager_id}
                onChange={(e) =>
                  setForm({ ...form, shift_manager_id: e.target.value })
                }
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Shift Manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">
                Shift * <span className="text-slate-400">({shifts.length})</span>
              </label>
              <select
                value={form.shift_id}
                onChange={(e) => setForm({ ...form, shift_id: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Shift</option>
                {shifts.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                    {s.start_time
                      ? ` (${String(s.start_time).slice(0, 5)}–${String(s.end_time || "").slice(0, 5)})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">
                Machine Name *{" "}
                <span className="text-slate-400">({machines.length})</span>
              </label>
              <select
                value={form.machine_id}
                onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Machine</option>
                {machines.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">
                Machine Operator *{" "}
                <span className="text-slate-400">({operators.length})</span>
              </label>
              <select
                value={form.operator_id}
                onChange={(e) =>
                  setForm({ ...form, operator_id: e.target.value })
                }
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Operator</option>
                {operators.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Remarks (Optional)</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={2}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter remarks here..."
            />
          </div>
          <div className="flex justify-end gap-3 items-center">
            <Link
              href="/production-department/list"
              className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50"
            >
              Cancel
            </Link>
            <div className="relative">
              <div className="flex rounded-lg overflow-hidden shadow-sm overflow-x-auto">
                <button
                  onClick={() => submitAssign(submitStatus)}
                  disabled={saving || mastersEmpty}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {saving
                    ? "Submitting..."
                    : form.is_shift_change
                    ? `Submit Shift Change · ${submitStatus}`
                    : `Submit & Start · ${submitStatus}`}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((o) => !o)}
                  disabled={saving || mastersEmpty}
                  className="px-2.5 py-2 bg-blue-700 hover:bg-blue-800 text-white border-l border-blue-500 disabled:opacity-50"
                  aria-label="Select status"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {statusMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setStatusMenuOpen(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-1 z-20 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Submit with status
                    </div>
                    {[
                      "Ready for Production",
                      "In Progress",
                      "Partially Completed",
                      "Completed",
                      "On Hold",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSubmitStatus(s);
                          setStatusMenuOpen(false);
                          submitAssign(s);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                          submitStatus === s
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-700"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Assignments (always show if any) */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
          <div className="px-5 py-3 border-b font-medium">
            Current Assignments ({assignments.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Operator</th>
                  <th className="px-3 py-2 text-left">Shift Manager</th>
                  <th className="px-3 py-2 text-left">Shift</th>
                  <th className="px-3 py-2 text-left">Machine</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a: any, i: number) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{a.operator_name || "—"}</td>
                    <td className="px-3 py-2">{a.manager_name || "—"}</td>
                    <td className="px-3 py-2">{a.shift_name || "—"}</td>
                    <td className="px-3 py-2">{a.machine_name || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
                        {a.status || "Not Started"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production Summary — detailed like reference */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Production Summary</h2>
            <p className="text-sm text-slate-500">
              View the details submitted by operator
            </p>
          </div>
          {records.length > 0 && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" /> Submitted
              </span>
              {latestRecord?.created_at && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Submitted on{" "}
                  {formatDate(latestRecord.created_at)}
                  {String(latestRecord.created_at).includes("T")
                    ? `, ${new Date(latestRecord.created_at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
                </p>
              )}
            </div>
          )}
        </div>

        {records.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">No production data available yet.</p>
            <p className="text-sm mt-1">
              Operator must open <strong>My Assignments</strong> → <strong>Start Work</strong> →
              enter production details and submit.
            </p>
            {assignments.length > 0 && (
              <p className="text-xs text-slate-500 mt-3">
                Assignment is already created (see table above). Waiting for operator submission.
              </p>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Machine & Shift Details */}
            <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
              <div className="px-4 py-2.5 bg-blue-50/80 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">
                  Machine &amp; Shift Details
                </h3>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-500 w-1/4 bg-slate-50/50">
                      Machine Number
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 w-1/4">
                      {latestAssign?.machine_name || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 w-1/4 bg-slate-50/50">
                      Project Manager
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 w-1/4">
                      {latestAssign?.manager_name || latestRecord?.manager_name || "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-500 bg-slate-50/50">
                      Machine Operator
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {latestAssign?.operator_name || latestRecord?.operator_name || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 bg-slate-50/50">Date</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {formatDate(latestAssign?.start_date || latestRecord?.start_date)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500 bg-slate-50/50">Shift</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {latestAssign?.shift_name || latestRecord?.shift_name || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 bg-slate-50/50">Timing</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {latestAssign?.start_time || latestRecord?.start_time || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Party-wise Production Details */}
            <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
              <div className="px-4 py-2.5 bg-blue-50/80 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">
                  Party-wise Production Details
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left font-semibold">#</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Party Name</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Input Weight (kg)</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Output Weight (kg)</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Input Length (m)</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Output Length (m)</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Remarks</th>
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
                          summary.totalIn > 0 &&
                          parties.reduce((s: number, x: any) => s + Number(x.weight_kg || 0), 0) > 0
                            ? partyIn /
                              parties.reduce((s: number, x: any) => s + Number(x.weight_kg || 0), 0)
                            : 0;
                        const outW =
                          summary.totalOut > 0
                            ? Math.round(summary.totalOut * ratio * 1000) / 1000
                            : 0;
                        const inL = Number(pa.length_m || 0);
                        const outL =
                          summary.totalLenIn > 0 &&
                          parties.reduce((s: number, x: any) => s + Number(x.length_m || 0), 0) > 0
                            ? Math.round(
                                summary.totalLenIn *
                                  (inL /
                                    parties.reduce(
                                      (s: number, x: any) => s + Number(x.length_m || 0),
                                      0
                                    )) *
                                  100
                              ) / 100
                            : inL;
                        return (
                          <tr key={pa.id || i} className="border-b border-slate-50">
                            <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              {pa.party_name || "—"}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {partyIn.toFixed(0)}
                            </td>
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
                      <tr className="bg-blue-50/60 font-semibold">
                        <td className="px-4 py-2.5" />
                        <td className="px-4 py-2.5">Total</td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {summary.totalIn > 0
                            ? summary.totalIn.toFixed(0)
                            : parties
                                .reduce((s: number, x: any) => s + Number(x.weight_kg || 0), 0)
                                .toFixed(0)}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {summary.totalOut.toFixed(0)}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {parties
                            .reduce((s: number, x: any) => s + Number(x.length_m || 0), 0)
                            .toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {(summary.totalLenIn ||
                            parties.reduce(
                              (s: number, x: any) => s + Number(x.length_m || 0),
                              0
                            )
                          ).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5">—</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary & Calculation */}
            <div className="rounded-xl border border-emerald-200 overflow-hidden overflow-x-auto">
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100">
                <h3 className="text-sm font-semibold text-slate-800">
                  Summary &amp; Calculation
                </h3>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-600 w-1/4">
                      Scrapping % by Length
                    </td>
                    <td className="px-4 py-2.5 font-semibold w-1/4">
                      {summary.scrapLenPct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 w-1/4">
                      Productivity % by Length
                    </td>
                    <td className="px-4 py-2.5 font-semibold w-1/4">
                      {summary.prodLenPct.toFixed(2)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600">Scrapping % by Weight</td>
                    <td className="px-4 py-2.5 font-semibold">
                      {summary.scrapPct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      Productivity % by Weight
                    </td>
                    <td className="px-4 py-2.5 font-semibold">
                      {summary.prodWtPct.toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Final Remark */}
            <div className="rounded-xl border border-amber-200 overflow-hidden overflow-x-auto">
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                <h3 className="text-sm font-semibold text-slate-800">Final Remark</h3>
              </div>
              <div className="px-4 py-3 text-sm text-slate-700 min-h-[48px] bg-slate-50/50">
                {records.map((r: any) => r.remarks).filter(Boolean).join(" | ") || "—"}
              </div>
            </div>

            {/* Operator submissions list (compact) */}
            {records.length > 1 && (
              <div className="text-xs text-slate-500">
                {records.length} operator submissions recorded for this plan.
              </div>
            )}
          </div>
        )}
      </div>

      {p.status !== "Completed" && records.length > 0 && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-medium border-b pb-2">Manager Review</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500">Operator Remarks</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm min-h-[60px]">
                {records.map((r: any) => r.remarks).filter(Boolean).join(" | ") || "—"}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Manager Remarks (Optional)</label>
              <textarea
                value={managerRemarks}
                onChange={(e) => setManagerRemarks(e.target.value)}
                rows={3}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Enter your remarks..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="px-4 py-2 border rounded-lg text-sm">
              Save as Draft
            </button>
            <button
              onClick={submitFinal}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" /> Submit Final Production
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
