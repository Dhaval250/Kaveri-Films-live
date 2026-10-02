import { NextResponse } from "next/server";
import { pool, Row } from "@/lib/db";
import { getSession } from "@/lib/auth";

type CacheEntry = { at: number; data: any };
const globalCache = globalThis as unknown as { __mastersCache?: CacheEntry };
const CACHE_MS = 30_000;

async function q(sql: string, params: any[] = []): Promise<any[]> {
  try {
    const [rows] = await pool.query<Row[]>(sql, params);
    return rows as any[];
  } catch (e: any) {
    console.error("masters query failed:", e.message);
    return [];
  }
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = Date.now();
    if (globalCache.__mastersCache && now - globalCache.__mastersCache.at < CACHE_MS) {
      return NextResponse.json(globalCache.__mastersCache.data);
    }

    const [products, departments, parties, managers, operators, machines, shifts] =
      await Promise.all([
        q(
          `SELECT id, name, density FROM products WHERE COALESCE(is_active, 1) = 1 ORDER BY name`
        ),
        q(`SELECT id, name FROM departments ORDER BY name`),
        q(`SELECT id, name FROM parties WHERE COALESCE(is_active, 1) = 1 ORDER BY name`),
        q(
          `SELECT id, name, email, role FROM users
           WHERE role IN ('Shift Manager','Super Admin','Admin')
             AND COALESCE(is_active, 1) = 1
           ORDER BY name`
        ),
        q(
          `SELECT id, name, email, role FROM users
           WHERE role = 'Operator' AND COALESCE(is_active, 1) = 1
           ORDER BY name`
        ),
        q(`SELECT id, name, department_id FROM machines WHERE COALESCE(is_active, 1) = 1 ORDER BY name`),
        q(`SELECT id, name, start_time, end_time FROM shifts ORDER BY name`),
      ]);

    const data = {
      products,
      departments,
      parties,
      managers,
      operators,
      machines,
      shifts,
      counts: {
        products: products.length,
        departments: departments.length,
        parties: parties.length,
        managers: managers.length,
        operators: operators.length,
        machines: machines.length,
        shifts: shifts.length,
      },
    };

    globalCache.__mastersCache = { at: now, data };
    return NextResponse.json(data);
  } catch (e: any) {
    console.error("masters error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
