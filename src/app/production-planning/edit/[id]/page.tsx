"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Calculator, AlertTriangle } from "lucide-react";
import {
  calculateLength,
  calculateWeightFromLength,
  calculateLiveAfterScrapping,
} from "@/lib/calculations";

type PartyRow = {
  id: string;
  partyName: string;
  widthMm: string;
  weightKg: string;
  lengthM: string;
};

const STATUS_OPTIONS = [
  "Draft",
  "Planned",
  "Ready for Production",
  "In Progress",
  "Partially Completed",
  "Completed",
  "On Hold",
  "Cancelled",
];

export default function EditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [planningNumber, setPlanningNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [department, setDepartment] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [thickness, setThickness] = useState("");
  const [density, setDensity] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [calculatedLength, setCalculatedLength] = useState(0);
  const [status, setStatus] = useState("Ready for Production");

  const [parties, setParties] = useState<PartyRow[]>([
    { id: "1", partyName: "", widthMm: "", weightKg: "", lengthM: "" },
  ]);

  const [scrapWidthCm, setScrapWidthCm] = useState("0");
  const [scrapWeightKg, setScrapWeightKg] = useState("0");
  const [scrapLengthM, setScrapLengthM] = useState("0");
  const [liveCalc, setLiveCalc] = useState({
    totalInputKg: 0,
    totalExpectedKg: 0,
    wasteKg: 0,
    wastePercentage: 0,
    productivityPct: 0,
    netLengthM: 0,
    scrapLengthM: 0,
    scrapPercentage: 0,
    scrapPctByWeight: 0,
    scrapPctByLength: 0,
    productivityByWeight: 100,
    productivityByLength: 100,
  });

  const [masterProducts, setMasterProducts] = useState<
    { id: number; name: string; density?: number }[]
  >([]);
  const [masterDepartments, setMasterDepartments] = useState<{ id: number; name: string }[]>([]);
  const [masterParties, setMasterParties] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/masters")
      .then((r) => r.json())
      .then((d) => {
        if (d.products) setMasterProducts(d.products);
        if (d.departments) setMasterDepartments(d.departments);
        if (d.parties) setMasterParties(d.parties);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/production-plans/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        const p = d.plan;
        setPlanningNumber(p.planning_number);
        setProductName(p.product_name || "");
        setDepartment(p.department_name || "");
        setWidthMm(String(p.width_mm ?? ""));
        setThickness(String(p.thickness_micron ?? ""));
        setDensity(String(p.density ?? ""));
        setWeightKg(String(p.weight_kg ?? ""));
        setCalculatedLength(Number(p.calculated_length) || 0);
        setStatus(p.status || "Ready for Production");
        if (d.parties?.length) {
          setParties(
            d.parties.map((pa: any, i: number) => ({
              id: String(pa.id || i + 1),
              partyName: pa.party_name || "",
              widthMm: String(pa.width_mm ?? ""),
              weightKg: String(pa.weight_kg ?? ""),
              lengthM: String(pa.length_m ?? ""),
            }))
          );
        }
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  // Main length
  useEffect(() => {
    const w = parseFloat(weightKg) || 0;
    const width = parseFloat(widthMm) || 0;
    const th = parseFloat(thickness) || 0;
    const den = parseFloat(density) || 0;
    setCalculatedLength(calculateLength(w, width, th, den));
  }, [weightKg, widthMm, thickness, density]);

  // Scrap always auto
  useEffect(() => {
    const mainW = parseFloat(weightKg) || 0;
    const mainWidth = parseFloat(widthMm) || 0;
    const th = parseFloat(thickness) || 0;
    const den = parseFloat(density) || 0;
    const partyW = parties.reduce((s, p) => s + (parseFloat(p.weightKg) || 0), 0);
    const partyWidth = parties.reduce((s, p) => s + (parseFloat(p.widthMm) || 0), 0);

    const scrapW = Math.max(0, Math.round((mainW - partyW) * 1000) / 1000);
    const scrapWidthMm = Math.max(0, Math.round((mainWidth - partyWidth) * 100) / 100);

    setScrapWeightKg(String(scrapW));
    setScrapWidthCm(String(scrapWidthMm));

    if (scrapW > 0 && mainWidth > 0 && th > 0 && den > 0) {
      setScrapLengthM(String(calculateLength(scrapW, mainWidth, th, den)));
    } else {
      setScrapLengthM("0");
    }
  }, [weightKg, widthMm, thickness, density, parties]);

  // Live calculations always
  useEffect(() => {
    const totalW = parseFloat(weightKg) || 0;
    const scrapW = parseFloat(scrapWeightKg) || 0;
    const width = parseFloat(widthMm) || 0;
    const th = parseFloat(thickness) || 0;
    const den = parseFloat(density) || 0;

    setLiveCalc(
      calculateLiveAfterScrapping(totalW, calculatedLength, scrapW, width, th, den)
    );
  }, [weightKg, scrapWeightKg, calculatedLength, widthMm, thickness, density]);

  const mainWidth = parseFloat(widthMm) || 0;
  const totalPartyWidth = parties.reduce(
    (s, p) => s + (parseFloat(p.widthMm) || 0),
    0
  );
  const totalPartyWeight = parties.reduce(
    (s, p) => s + (parseFloat(p.weightKg) || 0),
    0
  );
  const totalPartyLength = parties.reduce(
    (s, p) => s + (parseFloat(p.lengthM) || 0),
    0
  );
  const widthExceeded = mainWidth > 0 && totalPartyWidth > mainWidth + 0.001;

  const updateParty = (rowId: string, field: keyof PartyRow, value: string) => {
    setParties((prev) =>
      prev.map((p) => {
        if (p.id !== rowId) return p;
        const updated = { ...p, [field]: value };
        const mainW = parseFloat(widthMm) || 0;
        const th = parseFloat(thickness) || 0;
        const den = parseFloat(density) || 0;
        if (field === "weightKg" && value) {
          updated.lengthM = calculateLength(parseFloat(value), mainW, th, den).toString();
        } else if (field === "lengthM" && value) {
          updated.weightKg = calculateWeightFromLength(
            parseFloat(value),
            mainW,
            th,
            den
          ).toString();
        } else if (field === "widthMm" && updated.weightKg) {
          updated.lengthM = calculateLength(
            parseFloat(updated.weightKg),
            mainW,
            th,
            den
          ).toString();
        }
        return updated;
      })
    );
  };

  const addParty = () => {
    setParties((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        partyName: "",
        widthMm: "",
        weightKg: "",
        lengthM: "",
      },
    ]);
  };

  const removeParty = (rowId: string) => {
    setParties((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== rowId)));
  };

  const handleSave = async () => {
    if (!productName || !department) {
      alert("Please select Product Name and Department");
      return;
    }
    if (widthExceeded) {
      alert(`Total Party Width exceeds Enter Width (${mainWidth} mm)`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/production-plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName,
          department_name: department,
          width_mm: parseFloat(widthMm) || 0,
          thickness_micron: parseFloat(thickness) || 0,
          density: parseFloat(density) || 0,
          weight_kg: parseFloat(weightKg) || 0,
          calculated_length: calculatedLength,
          apply_scrapping: true,
          scrap_width_cm: parseFloat(scrapWidthCm) || null,
          scrap_weight_kg: parseFloat(scrapWeightKg) || 0,
          scrap_length_m: parseFloat(scrapLengthM) || liveCalc.scrapLengthM,
          scrap_percentage: liveCalc.scrapPercentage,
          total_input_kg: liveCalc.totalInputKg,
          total_expected_kg: liveCalc.totalExpectedKg,
          waste_kg: liveCalc.wasteKg,
          waste_percentage: liveCalc.wastePercentage,
          productivity_pct: liveCalc.productivityPct,
          net_length_m: liveCalc.netLengthM,
          status,
          parties: parties
            .filter((p) => p.partyName)
            .map((p) => ({
              partyName: p.partyName,
              widthMm: parseFloat(p.widthMm) || 0,
              weightKg: parseFloat(p.weightKg) || 0,
              lengthM: parseFloat(p.lengthM) || 0,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      alert("Planning updated successfully!");
      router.push("/production-planning/list");
    } catch (e: any) {
      alert(e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-20 text-center text-slate-400">Loading plan...</div>
    );
  }
  if (error) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/production-planning/list" className="text-blue-600 underline">
          Back to List
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Edit Production Planning</h1>
      </div>

      {/* 1. Product & Calculation */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-blue-600 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
            1
          </span>
          Product & Calculation Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Planning Number
            </label>
            <input
              type="text"
              value={planningNumber}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Product Name <span className="text-red-500">*</span>
            </label>
            <select
              value={productName}
              onChange={(e) => {
                const name = e.target.value;
                setProductName(name);
                const found = masterProducts.find((p) => p.name === name);
                if (found && found.density != null) setDensity(String(found.density));
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">Select Product</option>
              {masterProducts.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                  {p.density != null ? ` (${Number(p.density).toFixed(2)})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">Select Department</option>
              {masterDepartments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Enter Width (mm) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={widthMm}
              onChange={(e) => setWidthMm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Enter Thickness (micron) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Density (g/cc) — from product
            </label>
            <input
              type="text"
              readOnly
              value={density || "—"}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700"
              title="Auto-filled from selected product"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Weight (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Calculated Length (m)
            </label>
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-semibold text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              {calculatedLength.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Party Allocation */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-blue-600 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
            2
          </span>
          Party Allocation
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3 font-medium w-10">#</th>
                <th className="pb-3 font-medium">Party Name</th>
                <th className="pb-3 font-medium">Width (mm)</th>
                <th className="pb-3 font-medium">Weight (kg)</th>
                <th className="pb-3 font-medium">Length (m)</th>
                <th className="pb-3 font-medium w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((party, idx) => {
                const partyW = parseFloat(party.widthMm) || 0;
                const partyWidthInvalid = mainWidth > 0 && partyW > mainWidth;
                return (
                  <tr key={party.id} className="border-b border-slate-100">
                    <td className="py-3 text-slate-500">{idx + 1}</td>
                    <td className="py-3 pr-3">
                      <select
                        value={party.partyName}
                        onChange={(e) => updateParty(party.id, "partyName", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">Select Party</option>
                        {masterParties.map((pt) => (
                          <option key={pt.id} value={pt.name}>
                            {pt.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        type="number"
                        min="0"
                        value={party.widthMm}
                        onChange={(e) => updateParty(party.id, "widthMm", e.target.value)}
                        className={`w-full px-2.5 py-1.5 border rounded-lg text-sm ${
                          partyWidthInvalid
                            ? "border-red-400 bg-red-50"
                            : "border-slate-200"
                        }`}
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        type="number"
                        min="0"
                        value={party.weightKg}
                        onChange={(e) => updateParty(party.id, "weightKg", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        type="number"
                        min="0"
                        value={party.lengthM}
                        onChange={(e) => updateParty(party.id, "lengthM", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                      />
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => removeParty(party.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <button
            type="button"
            onClick={addParty}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-4 h-4" /> Add Party
          </button>
          <div
            className={`text-sm font-medium ${
              widthExceeded ? "text-red-600" : "text-emerald-600"
            }`}
          >
            Total Width: {totalPartyWidth.toFixed(0)} mm
            {mainWidth > 0 && (
              <span className="text-slate-400 font-normal"> / {mainWidth} mm</span>
            )}
            &nbsp;&nbsp; Total Weight: {totalPartyWeight.toFixed(2)} kg
            &nbsp;&nbsp; Total Length:{" "}
            {totalPartyLength.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            m
          </div>
        </div>
        {widthExceeded && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Total Party Width exceeds Enter Width ({mainWidth} mm).
          </div>
        )}
      </div>

      {/* 3. Process Scrapping + Live Calculations — single section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-blue-600 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
            3
          </span>
          Process Scrapping & Live Calculations
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Scrap Width (mm) — auto
            </label>
            <input
              type="text"
              readOnly
              value={scrapWidthCm || "0"}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-blue-50 text-blue-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Scrap Weight (kg) — auto
            </label>
            <input
              type="text"
              readOnly
              value={scrapWeightKg || "0"}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-blue-50 text-blue-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Scrap Length (m) — auto
            </label>
            <input
              type="text"
              readOnly
              value={scrapLengthM || "0"}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-blue-50 text-blue-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Total Input (kg)
            </label>
            <input
              type="text"
              value={liveCalc.totalInputKg.toFixed(2)}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Total Expected (kg)
            </label>
            <input
              type="text"
              value={liveCalc.totalExpectedKg.toFixed(2)}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Waste Weight (kg)
            </label>
            <input
              type="text"
              value={liveCalc.wasteKg.toFixed(2)}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Waste Length (m)
            </label>
            <input
              type="text"
              value={liveCalc.scrapLengthM.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Scrapping % by Weight
            </label>
            <input
              type="text"
              value={`${(liveCalc.scrapPctByWeight ?? liveCalc.wastePercentage).toFixed(2)}%`}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Scrapping % by Length
            </label>
            <input
              type="text"
              value={`${(liveCalc.scrapPctByLength ?? 0).toFixed(2)}%`}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Productivity % by Weight
            </label>
            <input
              type="text"
              value={`${(liveCalc.productivityByWeight ?? liveCalc.productivityPct).toFixed(2)}%`}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Productivity % by Length
            </label>
            <input
              type="text"
              value={`${(liveCalc.productivityByLength ?? 100).toFixed(2)}%`}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Net Length (m)
            </label>
            <input
              type="text"
              value={liveCalc.netLengthM.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-semibold text-blue-700"
            />
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap justify-end gap-3 items-end">
        <div className="min-w-[220px]">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || widthExceeded}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 rounded-lg"
        >
          <Save className="w-4 h-4" />
          {saving ? "Updating..." : `Update as ${status}`}
        </button>
      </div>
    </div>
  );
}
