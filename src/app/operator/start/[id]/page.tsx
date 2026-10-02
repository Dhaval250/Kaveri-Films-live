"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, RotateCcw } from "lucide-react";
import LoadingState from "@/components/LoadingState";

type PartyRow = {
  id: number | string;
  party_name: string;
  width_mm: number;
  weight_kg: number;
  length_m?: number;
  actual_weight: string;
  actual_length: string;
  remark: string;
};

export default function OperatorProductionEntryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [generalRemark, setGeneralRemark] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/operator/assignments/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        const list = (d.parties || []).map((x: any) => ({
          id: x.id,
          party_name: x.party_name || "—",
          width_mm: Number(x.width_mm || 0),
          weight_kg: Number(x.weight_kg || 0),
          length_m: Number(x.length_m || 0),
          actual_weight: "",
          actual_length: "",
          remark: "",
        }));
        setParties(list);
      });
  }, [id]);

  const updateParty = (
    rowId: number | string,
    field: "actual_weight" | "actual_length" | "remark",
    value: string
  ) => {
    setParties((prev) =>
      prev.map((p) => (p.id === rowId ? { ...p, [field]: value } : p))
    );
  };

  const reset = () => {
    setParties((prev) =>
      prev.map((p) => ({
        ...p,
        actual_weight: "",
        actual_length: "",
        remark: "",
      }))
    );
    setGeneralRemark("");
  };

  const ensureStarted = async () => {
    const status = data?.assignment?.status;
    if (status === "Not Started" || !status) {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      const res = await fetch(`/api/operator/assignments/${id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_start_datetime: local,
          start_remarks: generalRemark || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to start");
    }
  };

  const submit = async () => {
    // Actual Weight required; Actual Length is optional
    const missing = parties.some((p) => !p.actual_weight.trim());
    if (missing) {
      return alert("Please enter Actual Weight for all parties");
    }

    const totalActualW = parties.reduce(
      (s, p) => s + (parseFloat(p.actual_weight) || 0),
      0
    );
    const totalActualL = parties.reduce(
      (s, p) => s + (parseFloat(p.actual_length) || 0),
      0
    );
    const planW = Number(data?.plan?.weight_kg || 0);
    if (planW > 0 && totalActualW > planW + 0.001) {
      return alert(
        `Total Actual Weight (${totalActualW} kg) cannot exceed Planned Weight (${planW} kg)`
      );
    }

    const partyNotes = parties
      .map((p) => {
        const parts = [`${p.party_name}: ${p.actual_weight} kg`];
        if (p.actual_length.trim()) parts.push(`${p.actual_length} m`);
        if (p.remark.trim()) parts.push(`(${p.remark})`);
        return parts.join(" / ");
      })
      .join(" | ");
    const remarks = [generalRemark.trim(), partyNotes].filter(Boolean).join("\n");

    setSaving(true);
    try {
      await ensureStarted();
      const res = await fetch(`/api/operator/assignments/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_weight_kg: totalActualW,
          output_weight_kg: totalActualW,
          actual_length_m: totalActualL,
          waste_weight_kg: Math.max(0, planW - totalActualW),
          waste_percentage:
            planW > 0
              ? Math.round(((planW - totalActualW) / planW) * 10000) / 100
              : 0,
          actual_width_mm: data?.plan?.width_mm || null,
          actual_thickness_micron: data?.plan?.thickness_micron || null,
          remarks,
          status: "Submitted",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Submit failed");
      alert("Production entry submitted successfully");
      router.push("/operator/assignments");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <LoadingState fullPage label="Loading…" />
    );
  }

  const a = data.assignment || {};
  const p = data.plan || {};
  const locked = a.status === "Submitted" || a.status === "Completed";

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Operator – Production Entry
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Planning Number :{" "}
            <span className="font-semibold text-blue-600">
              {p.planning_number || "—"}
            </span>
          </p>
        </div>
        <Link
          href="/operator/assignments"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {/* Simple summary: Product → Jumbo → parties */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div>
          <span className="text-slate-500">Product:</span>{" "}
          <span className="font-semibold text-slate-800">
            {p.product_name || "—"}
          </span>
          {p.thickness_micron != null && (
            <span className="text-slate-500"> · {p.thickness_micron} µ</span>
          )}
        </div>
        <div>
          <span className="text-slate-500">Jumbo:</span>{" "}
          <span className="font-semibold text-slate-800">
            {p.width_mm != null ? `${p.width_mm} mm` : "—"}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Plan Weight:</span>{" "}
          <span className="font-semibold text-slate-800">
            {Number(p.weight_kg || 0).toFixed(2)} kg
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-3 py-3 text-left font-medium border-b border-slate-200">
                  Party Name
                </th>
                <th className="px-3 py-3 text-left font-medium border-b border-slate-200">
                  Width
                  <br />
                  <span className="font-normal text-xs">(mm)</span>
                </th>
                <th className="px-3 py-3 text-left font-medium border-b border-slate-200">
                  Weight
                  <br />
                  <span className="font-normal text-xs">(kg)</span>
                </th>
                <th className="px-3 py-3 text-left font-medium border-b border-slate-200">
                  Actual Weight *
                  <br />
                  <span className="font-normal text-xs">(kg)</span>
                </th>
                <th className="px-3 py-3 text-left font-medium border-b border-slate-200">
                  Actual Length
                  <br />
                  <span className="font-normal text-xs">(m) optional</span>
                </th>
                <th className="px-3 py-3 text-left font-medium border-b border-slate-200">
                  Remark
                </th>
              </tr>
            </thead>
            <tbody>
              {parties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No party allocation found for this plan
                  </td>
                </tr>
              ) : (
                parties.map((party) => (
                  <tr key={party.id} className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {party.party_name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {party.width_mm || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {party.weight_kg || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={locked}
                        value={party.actual_weight}
                        onChange={(e) =>
                          updateParty(party.id, "actual_weight", e.target.value)
                        }
                        placeholder="Enter"
                        className="w-28 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={locked}
                        value={party.actual_length}
                        onChange={(e) =>
                          updateParty(party.id, "actual_length", e.target.value)
                        }
                        placeholder="Optional"
                        className="w-28 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        disabled={locked}
                        value={party.remark}
                        onChange={(e) =>
                          updateParty(party.id, "remark", e.target.value)
                        }
                        placeholder="Enter remark"
                        className="w-36 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-5 border-t border-slate-100 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              General Remark (Optional)
            </label>
            <textarea
              rows={3}
              disabled={locked}
              value={generalRemark}
              onChange={(e) => setGeneralRemark(e.target.value)}
              placeholder="Enter remark here..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
            />
          </div>

          {!locked && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving || parties.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {saving ? "Submitting..." : "Submit"}
              </button>
            </div>
          )}
          {locked && (
            <p className="text-sm text-slate-500">
              This assignment is already {a.status}. Entry is locked.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
