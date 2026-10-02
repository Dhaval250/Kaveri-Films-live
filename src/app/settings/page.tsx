"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  RefreshCw,
  Building2,
  Sliders,
  FileText,
} from "lucide-react";

type SettingsMap = Record<string, string>;

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"company" | "defaults" | "report">("company");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSettings(data.settings || {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key: string, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg("Settings saved successfully");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const input = (
    label: string,
    key: string,
    opts?: { type?: string; placeholder?: string }
  ) => (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type={opts?.type || "text"}
        value={settings[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={opts?.placeholder}
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" /> Settings
        </h1>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
          {msg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b">
        {[
          { id: "company" as const, label: "Company", icon: Building2 },
          { id: "defaults" as const, label: "Defaults", icon: Sliders },
          { id: "report" as const, label: "Report", icon: FileText },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Loading settings...</div>
      ) : (
        <div className="bg-white rounded-xl border p-6 space-y-4 max-w-3xl">
          {tab === "company" && (
            <>
              <h2 className="font-medium text-slate-800 border-b pb-2">
                Company Profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {input("Company Name", "company_name", {
                  placeholder: "Kaveri Metallising",
                })}
                {input("GST / Tax ID", "company_gst", {
                  placeholder: "GSTIN",
                })}
                {input("Phone", "company_phone", { placeholder: "+91 ..." })}
                {input("Email", "company_email", {
                  type: "email",
                  placeholder: "info@kaveri.com",
                })}
              </div>
              <div>
                <label className="text-xs text-slate-500">Address</label>
                <textarea
                  value={settings.company_address ?? ""}
                  onChange={(e) => set("company_address", e.target.value)}
                  rows={3}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Factory / office address"
                />
              </div>
            </>
          )}

          {tab === "defaults" && (
            <>
              <h2 className="font-medium text-slate-800 border-b pb-2">
                Production Defaults
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {input("Default Density (g/cc)", "default_density", {
                  placeholder: "1.39",
                })}
                {input("Default Thickness (micron)", "default_thickness", {
                  placeholder: "12",
                })}
                <div>
                  <label className="text-xs text-slate-500">Date Format</label>
                  <select
                    value={settings.date_format ?? "dd/mm/yyyy"}
                    onChange={(e) => set("date_format", e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                    <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                    <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Currency</label>
                  <select
                    value={settings.currency ?? "INR"}
                    onChange={(e) => set("currency", e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Defaults are stored for reference. Planning form can use these values when
                you wire them on Add Planning.
              </p>
            </>
          )}

          {tab === "report" && (
            <>
              <h2 className="font-medium text-slate-800 border-b pb-2">
                Report Options
              </h2>
              <div>
                <label className="text-xs text-slate-500">Report Footer Text</label>
                <input
                  value={settings.report_footer ?? ""}
                  onChange={(e) => set("report_footer", e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Shown on PDF / Excel exports"
                />
              </div>
              <p className="text-xs text-slate-500">
                CRM reports are under <strong>Reports</strong> in the sidebar — Overview,
                By Client, By Product tabs with CSV / Excel / PDF download.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
