"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calculator, Save, AlertTriangle } from "lucide-react";
import {
  calculateLength,
  calculateWeightFromLength,
  calculateLiveAfterScrapping,
} from "@/lib/calculations";

type PartyRow = {
  id: string;
  partyId: string;
  partyName: string;
  widthMm: string;
  weightKg: string;
  lengthM: string;
  isAuto: boolean;
};

export default function AddPlanningPage() {
  const router = useRouter();

  // Product & Calculation
  const [planningNumber] = useState("Auto Generate");
  const [productName, setProductName] = useState("");
  const [department, setDepartment] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [thickness, setThickness] = useState("");
  const [density, setDensity] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [calculatedLength, setCalculatedLength] = useState(0);

  // Party Allocation
  const [parties, setParties] = useState<PartyRow[]>([
    {
      id: "1",
      partyId: "",
      partyName: "",
      widthMm: "",
      weightKg: "",
      lengthM: "",
      isAuto: false,
    },
  ]);

  // Process Scrapping
  const applyScrapping = true; // always on — auto calculate
  const [scrapWidthCm, setScrapWidthCm] = useState("");
  const [scrapWeightKg, setScrapWeightKg] = useState("");
  const [scrapLengthM, setScrapLengthM] = useState(""); // editable
  const [scrapLengthIsAuto, setScrapLengthIsAuto] = useState(true);
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

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Ready for Production");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Masters from database
  const [masterProducts, setMasterProducts] = useState<{ id: number; name: string; density?: number }[]>([]);
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

  // Recalculate main length
  useEffect(() => {
    const w = parseFloat(weightKg) || 0;
    const width = parseFloat(widthMm) || 0;
    const th = parseFloat(thickness) || 0;
    const den = parseFloat(density) || 0;
    setCalculatedLength(calculateLength(w, width, th, den));
  }, [weightKg, widthMm, thickness, density]);

  // Process Scrapping — always AUTO from (Main Weight − Party Total Weight)
  useEffect(() => {
    const mainW = parseFloat(weightKg) || 0;
    const mainWidth = parseFloat(widthMm) || 0;
    const th = parseFloat(thickness) || 0;
    const den = parseFloat(density) || 0;
    const partyW = parties.reduce((s, p) => s + (parseFloat(p.weightKg) || 0), 0);
    const partyWidth = parties.reduce((s, p) => s + (parseFloat(p.widthMm) || 0), 0);

    const scrapW = Math.max(0, Math.round((mainW - partyW) * 1000) / 1000);
    // Scrap Width (mm) = Enter Width − Total Party Width
    const scrapWidthMm = Math.max(0, Math.round((mainWidth - partyWidth) * 100) / 100);

    setScrapWeightKg(String(scrapW));
    setScrapWidthCm(String(scrapWidthMm));
    setScrapLengthIsAuto(true);

    if (scrapW > 0 && mainWidth > 0 && th > 0 && den > 0) {
      setScrapLengthM(String(calculateLength(scrapW, mainWidth, th, den)));
    } else {
      setScrapLengthM("0");
    }
  }, [weightKg, widthMm, thickness, density, parties]);

  // Recalculate live after scrapping
  useEffect(() => {
    const totalW = parseFloat(weightKg) || 0;
    const scrapW = parseFloat(scrapWeightKg) || 0;
    const scrapL = parseFloat(scrapLengthM) || 0;
    const width = parseFloat(widthMm) || 0;
    const th = parseFloat(thickness) || 0;
    const den = parseFloat(density) || 0;

    // Always run live calc (scrapping is always auto)
    const effectiveScrapW =
      scrapW > 0
        ? scrapW
        : scrapL > 0 && width > 0 && th > 0 && den > 0
          ? calculateWeightFromLength(scrapL, width, th, den)
          : 0;

    const calc = calculateLiveAfterScrapping(
      totalW,
      calculatedLength,
      effectiveScrapW,
      width,
      th,
      den
    );
    if (!scrapLengthIsAuto && scrapL > 0) {
      calc.scrapLengthM = Math.round(scrapL * 100) / 100;
      calc.netLengthM =
        Math.round((calculatedLength - scrapL) * 100) / 100;
      calc.scrapPctByLength =
        calculatedLength > 0
          ? Math.round((scrapL / calculatedLength) * 10000) / 100
          : 0;
      calc.productivityByLength =
        Math.round((100 - calc.scrapPctByLength) * 100) / 100;
    }
    setLiveCalc(calc);
  }, [
    weightKg,
    scrapWeightKg,
    scrapLengthM,
    scrapLengthIsAuto,
    calculatedLength,
    widthMm,
    thickness,
    density,
  ]);

  const mainWidth = parseFloat(widthMm) || 0;
  const totalPartyWidth = parties.reduce(
    (sum, p) => sum + (parseFloat(p.widthMm) || 0),
    0
  );
  const totalPartyWeight = parties.reduce(
    (sum, p) => sum + (parseFloat(p.weightKg) || 0),
    0
  );
  // Total Length = sum of party Length (m) column values
  const totalPartyLength = parties.reduce(
    (sum, p) => sum + (parseFloat(p.lengthM) || 0),
    0
  );

  const widthExceeded =
    mainWidth > 0 && totalPartyWidth > mainWidth + 0.001;

  const updateParty = (id: string, field: keyof PartyRow, value: string) => {
    setParties((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };

        // Party Length/Weight uses MAIN Enter Width (not party width).
        // e.g. Weight 250 kg @ Enter Width 1000 → Length 14,988.01 m
        const mainW = parseFloat(widthMm) || 0;
        const th = parseFloat(thickness) || 0;
        const den = parseFloat(density) || 0;

        if (field === "weightKg" && value) {
          updated.lengthM = calculateLength(
            parseFloat(value),
            mainW,
            th,
            den
          ).toString();
          updated.isAuto = false;
        } else if (field === "lengthM" && value) {
          updated.weightKg = calculateWeightFromLength(
            parseFloat(value),
            mainW,
            th,
            den
          ).toString();
          updated.isAuto = true;
        } else if (field === "widthMm") {
          if (updated.weightKg) {
            updated.lengthM = calculateLength(
              parseFloat(updated.weightKg),
              mainW,
              th,
              den
            ).toString();
          } else if (updated.lengthM) {
            updated.weightKg = calculateWeightFromLength(
              parseFloat(updated.lengthM),
              mainW,
              th,
              den
            ).toString();
          }
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
        partyId: "",
        partyName: "",
        widthMm: "",
        weightKg: "",
        lengthM: "",
        isAuto: false,
      },
    ]);
  };

  const removeParty = (id: string) => {
    setParties((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  };

  const handleSave = async (statusOverride?: string) => {
    if (!productName || !department) {
      alert("Please select Product Name and Department");
      return;
    }
    if (!widthMm || !thickness || !density || !weightKg) {
      alert("Please fill Width, Thickness, Density and Weight");
      return;
    }

    // Party width validation
    if (mainWidth > 0) {
      for (const p of parties) {
        const pw = parseFloat(p.widthMm) || 0;
        if (pw > mainWidth) {
          alert(
            `Party width (${pw} mm) cannot be greater than Enter Width (${mainWidth} mm).\nParty width must be ≤ ${mainWidth} mm.`
          );
          return;
        }
      }
      if (totalPartyWidth > mainWidth) {
        alert(
          `Total Party Width (${totalPartyWidth} mm) exceeds Enter Width (${mainWidth} mm).\nTotal of all party widths must be ≤ ${mainWidth} mm.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/production-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planning_number: planningNumber,
          product_name: productName,
          department_name: department,
          width_mm: parseFloat(widthMm) || 0,
          thickness_micron: parseFloat(thickness) || 0,
          density: parseFloat(density) || 0,
          weight_kg: parseFloat(weightKg) || 0,
          calculated_length: calculatedLength,
          apply_scrapping: applyScrapping,
          scrap_width_cm: parseFloat(scrapWidthCm) || null,
          scrap_weight_kg: parseFloat(scrapWeightKg) || liveCalc.wasteKg || 0,
          scrap_length_m: parseFloat(scrapLengthM) || liveCalc.scrapLengthM,
          scrap_percentage: liveCalc.scrapPercentage,
          total_input_kg: liveCalc.totalInputKg,
          total_expected_kg: liveCalc.totalExpectedKg,
          waste_kg: liveCalc.wasteKg,
          waste_percentage: liveCalc.wastePercentage,
          productivity_pct: liveCalc.productivityPct,
          net_length_m: liveCalc.netLengthM,
          status: statusOverride || saveStatus || "Draft",
          parties: parties
            .filter((p) => p.partyName || p.partyId)
            .map((p) => ({
              partyName: p.partyName,
              party_id: p.partyId || undefined,
              widthMm: parseFloat(p.widthMm) || 0,
              weightKg: parseFloat(p.weightKg) || 0,
              lengthM: parseFloat(p.lengthM) || 0,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      alert("Planning saved as " + (statusOverride || saveStatus) + "!\nNumber: " + data.planning_number);
      router.push("/production-planning/list");
    } catch (e: any) {
      alert(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Add New Production Planning
        </h1>
      </div>

      {/* 1. Product & Calculation Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
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
                if (found && found.density != null) {
                  setDensity(String(found.density));
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              placeholder="e.g. 1000"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Enter Thickness (micron) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              placeholder="e.g. 12"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              placeholder="Select product"
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
              placeholder="e.g. 500"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Calculated Length (m)
            </label>
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-semibold text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              {calculatedLength.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Party Allocation */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
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
                <th className="pb-3 font-medium">Weight (kg) (Optional)</th>
                <th className="pb-3 font-medium">Length (m) (Optional)</th>
                <th className="pb-3 font-medium w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((party, idx) => {
                const partyW = parseFloat(party.widthMm) || 0;
                const partyWidthInvalid =
                  mainWidth > 0 && partyW > mainWidth;
                return (
                  <tr key={party.id} className="border-b border-slate-100">
                    <td className="py-3 text-slate-500">{idx + 1}</td>
                    <td className="py-3 pr-3">
                      <select
                        value={party.partyName}
                        onChange={(e) =>
                          updateParty(party.id, "partyName", e.target.value)
                        }
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
                        onChange={(e) =>
                          updateParty(party.id, "widthMm", e.target.value)
                        }
                        placeholder={
                          mainWidth > 0 ? `≤ ${mainWidth}` : "Width"
                        }
                        className={`w-full px-2.5 py-1.5 border rounded-lg text-sm ${
                          partyWidthInvalid
                            ? "border-red-400 bg-red-50 text-red-700"
                            : "border-slate-200"
                        }`}
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        type="number"
                        min="0"
                        value={party.weightKg}
                        onChange={(e) =>
                          updateParty(party.id, "weightKg", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                        placeholder="Optional"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        type="number"
                        min="0"
                        value={party.lengthM}
                        onChange={(e) =>
                          updateParty(party.id, "lengthM", e.target.value)
                        }
                        className={`w-full px-2.5 py-1.5 border rounded-lg text-sm ${
                          party.isAuto
                            ? "bg-slate-50 border-slate-200 text-slate-500"
                            : "border-slate-200"
                        }`}
                        placeholder="Optional"
                      />
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => removeParty(party.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Remove party"
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={addParty}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Party
          </button>
          <div
            className={`text-sm font-medium ${
              widthExceeded ? "text-red-600" : "text-emerald-600"
            }`}
          >
            Total Width: {totalPartyWidth.toFixed(0)} mm
            {mainWidth > 0 && (
              <span className="text-slate-400 font-normal">
                {" "}
                / {mainWidth} mm
              </span>
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
            <span>
              Total Party Width ({totalPartyWidth} mm) exceeds Enter Width (
              {mainWidth} mm). Each party width and the total must be ≤ Enter
              Width.
            </span>
          </div>
        )}

        </div>

      {/* 3. Process Scrapping + Live Calculations — single section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
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

      {/* Bottom Actions — full Status dropdown + Save */}
      <div className="flex flex-wrap justify-end gap-3 pb-8 items-end">
        <div className="min-w-[220px]">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            value={saveStatus}
            onChange={(e) => setSaveStatus(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Draft">Draft</option>
            <option value="Planned">Planned</option>
            <option value="Ready for Production">Ready for Production</option>
            <option value="In Progress">In Progress</option>
            <option value="Partially Completed">Partially Completed</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Cancelled">Cancelled</option>
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
          onClick={() => handleSave(saveStatus)}
          disabled={saving || widthExceeded}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 rounded-lg"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : `Save as ${saveStatus}`}
        </button>
      </div>
    </div>
  );
}
