import { NextRequest, NextResponse } from "next/server";
import { pool, Row } from "@/lib/db";
import { getSession } from "@/lib/auth";

const DEFAULTS: Record<string, string> = {
  company_name: "Kaveri Metallising",
  company_address: "",
  company_phone: "",
  company_email: "",
  company_gst: "",
  default_density: "1.39",
  default_thickness: "12",
  date_format: "dd/mm/yyyy",
  currency: "INR",
  report_footer: "Kaveri Metallising — Confidential",
};

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`app_settings\` (
      \`setting_key\` VARCHAR(100) NOT NULL,
      \`setting_value\` TEXT NULL,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`setting_key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTable();
    const [rows] = await pool.query<Row[]>(
      `SELECT setting_key, setting_value FROM app_settings`
    );
    const map: Record<string, string> = { ...DEFAULTS };
    (rows as any[]).forEach((r) => {
      map[r.setting_key] = r.setting_value ?? "";
    });
    return NextResponse.json({ settings: map });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Super Admin", "Admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureTable();
    const body = await req.json();
    const settings = body.settings || body;
    if (typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      if (typeof key !== "string" || key.length > 100) continue;
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value == null ? "" : String(value)]
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
