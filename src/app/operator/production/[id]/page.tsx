"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, AlertTriangle } from "lucide-react";
import LoadingState from "@/components/LoadingState";

export default function EnterProductionPage() {
  const { id } = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const viewOnly = search.get("view") === "1";

  const [data, setData] = useState<any>(null);
  const [inputWeight, setInputWeight] = useState("");
  const [actualLength, setActualLength] = useState("");
  const [wasteWeight, setWasteWeight] = useState("");
  const [actualWidth, setActualWidth] = useState("");
  const [actualThickness, setActualThickness] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/operator/assignments/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.plan) {
          setActualWidth(String(d.plan.width_mm || ""));
          setActualThickness(String(d.plan.thickness_micron || ""));
        }
        if (d.latestRecord) {
          const r = d.latestRecord;
          setInputWeight(String(r.input_weight_kg || ""));
          setActualLength(String(r.actual_length_m || ""));
          setWasteWeight(String(r.waste_weight_kg || ""));
          setRemarks(r.remarks || "");
        }
        setRecords(d.records || []);
      });
  }, [id]);

  const planWeight = parseFloat(data?.plan?.weight_kg) || 0;
  const planLength =
    parseFloat(data?.plan?.net_length_m || data?.plan?.calculated_length) || 0;

  const live = useMemo(() => {
    const inp = parseFloat(inputWeight) || 0;
    const waste = parseFloat(wasteWeight) || 0;
    const out = Math.max(0, inp - waste);
    const wastePct = inp > 0 ? Math.round((waste / inp) * 10000) / 100 : 0;
    const remWeight = Math.max(0, planWeight - inp);
    const remLength =
      planWeight > 0
        ? Math.round((remWeight / planWeight) * planLength * 100) / 100
        : 0;
    const weightOver = planWeight > 0 && inp > planWeight + 0.0001;
    const lengthOver =
      planLength > 0 && (parseFloat(actualLength) || 0) > planLength + 0.0001;
    return { inp, out, waste, wastePct, remWeight, remLength, weightOver, lengthOver };
  }, [inputWeight, wasteWeight, actualLength, planWeight, planLength]);

  const submit = async (asDraft = false) => {
    if (!asDraft && !remarks.trim()) return alert("Remarks are mandatory");
    // Actual Weight required; Actual Length optional
    if (!inputWeight) return alert("Actual Weight is required");

    const w = parseFloat(inputWeight) || 0;
    const len = parseFloat(actualLength) || 0;

    if (planWeight > 0 && w > planWeight) {
      return alert(
        `Actual Weight (${w} kg) cannot be greater than Planned Weight (${planWeight} kg).\nYou can enter equal or less only.`
      );
    }
    if (actualLength && planLength > 0 && len > planLength) {
      return alert(
        `Actual Length (${len} m) cannot be greater than Planned Length (${planLength} m).\nYou can enter equal or less only.`
      );
    }
    if (w <= 0) {
      return alert("Actual Weight must be greater than 0");
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/operator/assignments/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_weight_kg: w,
          output_weight_kg: live.out,
          actual_length_m: len,
          waste_weight_kg: parseFloat(wasteWeight) || 0,
          waste_percentage: live.wastePct,
          actual_width_mm: parseFloat(actualWidth) || null,
          actual_thickness_micron: parseFloat(actualThickness) || null,
          remarks,
          status: asDraft ? "Draft" : "Submitted",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      router.push("/operator/assignments");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <LoadingState fullPage label="Loading…" />;
  const a = data.assignment || {};
  const p = data.plan || {};
  const parties = data.parties || [];
  const locked =
    viewOnly || a.status === "Submitted" || a.status === "Completed";

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Enter Production Details
        </h1>
        <Link
          href="/operator/assignments"
          className="inline-flex items-center gap-2 text-sm text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assignments
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5 space-y-3 text-sm">
          <h2 className="font-medium border-b pb-2">
            Planning & Assignment Details (Read Only)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500">Planning Number</span>
              <div className="font-medium">{p.planning_number}</div>
            </div>
            <div>
              <span className="text-slate-500">Product Name</span>
              <div className="font-medium">{p.product_name}</div>
            </div>
            <div>
              <span className="text-slate-500">Department</span>
              <div className="font-medium">{p.department_name}</div>
            </div>
            <div>
              <span className="text-slate-500">Machine Name</span>
              <div className="font-medium">{a.machine_name}</div>
            </div>
            <div>
              <span className="text-slate-500">Shift</span>
              <div className="font-medium">{a.shift_name}</div>
            </div>
            <div>
              <span className="text-slate-500">Shift Manager</span>
              <div className="font-medium">{a.manager_name}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 space-y-3 text-sm">
          <h2 className="font-medium border-b pb-2">Work Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500">Operator Name</span>
              <div className="font-medium">{a.operator_name}</div>
            </div>
            <div>
              <span className="text-slate-500">Start Time</span>
              <div className="font-medium">{a.actual_start_datetime || "-"}</div>
            </div>
            <div>
              <span className="text-slate-500">Status</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                {a.status}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Planned Weight (kg)</span>
              <div className="font-semibold text-blue-700">
                {Number(planWeight).toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Planned Length (m)</span>
              <div className="font-semibold text-blue-700">
                {Number(planLength).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Party / Client Allocation */}
      {parties.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 border-b font-medium">Party Allocation (Client Data)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Party / Client</th>
                  <th className="px-3 py-2 text-left">Width (mm)</th>
                  <th className="px-3 py-2 text-left">Weight (kg)</th>
                  <th className="px-3 py-2 text-left">Length (m)</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((pa: any, i: number) => (
                  <tr key={pa.id || i} className="border-t">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{pa.party_name}</td>
                    <td className="px-3 py-2">{Number(pa.width_mm).toFixed(2)}</td>
                    <td className="px-3 py-2">{Number(pa.weight_kg).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {Number(pa.length_m).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-medium border-b pb-2">Production Output Details</h2>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
            Actual Weight / Length can be <strong>equal or less</strong> than
            Planned values only. Cannot exceed Planned Weight (
            {planWeight.toFixed(2)} kg) or Planned Length (
            {planLength.toLocaleString("en-IN", { minimumFractionDigits: 2 })} m).
          </div>

          {(live.weightOver || live.lengthOver) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {live.weightOver && (
                  <>
                    Actual Weight exceeds Planned Weight ({planWeight.toFixed(2)}{" "}
                    kg).{" "}
                  </>
                )}
                {live.lengthOver && (
                  <>
                    Actual Length exceeds Planned Length (
                    {planLength.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    m).
                  </>
                )}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">
                Actual Weight (kg) *{" "}
                <span className="text-slate-400">max {planWeight.toFixed(2)}</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={planWeight || undefined}
                disabled={locked}
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-50 ${
                  live.weightOver ? "border-red-400 bg-red-50" : ""
                }`}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">
                Actual Length (m){" "}
                <span className="text-slate-400">(optional)</span>
                {planLength > 0 && (
                  <span className="text-slate-400">
                    {" "}
                    max{" "}
                    {planLength.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={planLength || undefined}
                disabled={locked}
                value={actualLength}
                onChange={(e) => setActualLength(e.target.value)}
                className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-50 ${
                  live.lengthOver ? "border-red-400 bg-red-50" : ""
                }`}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">
                Waste / Scrap Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={locked}
                value={wasteWeight}
                onChange={(e) => setWasteWeight(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Waste / Scrap %</label>
              <input
                type="text"
                disabled
                value={live.wastePct.toFixed(2)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Actual Width (mm)</label>
              <input
                type="number"
                step="0.01"
                disabled={locked}
                value={actualWidth}
                onChange={(e) => setActualWidth(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">
                Actual Thickness (micron)
              </label>
              <input
                type="number"
                step="0.01"
                disabled={locked}
                value={actualThickness}
                onChange={(e) => setActualThickness(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Remarks (Mandatory) *</label>
            <textarea
              disabled={locked}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-50"
              placeholder="Roll running smooth. No major issue..."
            />
          </div>
          {!locked && (
            <div className="flex justify-end gap-3">
              <Link
                href="/operator/assignments"
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </Link>
              <button
                onClick={() => submit(true)}
                disabled={saving || live.weightOver || live.lengthOver}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                onClick={() => submit(false)}
                disabled={saving || live.weightOver || live.lengthOver}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Submit Production
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-medium border-b pb-2 text-blue-700">
            Live Calculation
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Planned Weight (kg)</span>
              <span className="font-medium">{planWeight.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Planned Length (m)</span>
              <span className="font-medium">
                {planLength.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-slate-500">Input Weight (kg)</span>
              <span className="font-medium">{live.inp.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Output Weight (kg)</span>
              <span className="font-medium">{live.out.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waste Weight (kg)</span>
              <span className="font-medium">{live.waste.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waste %</span>
              <span className="font-medium">{live.wastePct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-slate-500">Remaining Weight (kg)</span>
              <span className="font-medium">{live.remWeight.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Remaining Length (m)</span>
              <span className="font-medium">{live.remLength.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {records.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 border-b font-medium">My Submitted Records</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Submit Date</th>
                <th className="px-4 py-2 text-left">Start Time</th>
                <th className="px-4 py-2 text-left">Input Weight (kg)</th>
                <th className="px-4 py-2 text-left">Output Weight (kg)</th>
                <th className="px-4 py-2 text-left">Waste (kg)</th>
                <th className="px-4 py-2 text-left">Waste %</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r: any, i: number) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{r.submitted_at || r.created_at}</td>
                  <td className="px-4 py-2">{a.actual_start_datetime || "-"}</td>
                  <td className="px-4 py-2">{r.input_weight_kg}</td>
                  <td className="px-4 py-2">{r.output_weight_kg}</td>
                  <td className="px-4 py-2">{r.waste_weight_kg}</td>
                  <td className="px-4 py-2">{r.waste_percentage}%</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
