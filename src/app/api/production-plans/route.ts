import { NextRequest, NextResponse } from "next/server";
import { pool, Row, Result } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const conditions: string[] = [];
    const params: any[] = [];

    if (sp.get("from")) { conditions.push("p.plan_date >= ?"); params.push(sp.get("from")); }
    if (sp.get("to")) { conditions.push("p.plan_date <= ?"); params.push(sp.get("to")); }
    if (sp.get("status")) {
      conditions.push("p.status = ?");
      params.push(sp.get("status"));
    } else if (sp.get("history") === "1") {
      conditions.push("p.status IN ('Completed', 'Cancelled')");
    } else {
      // Active planning list — completed moves to Planning History
      conditions.push("p.status NOT IN ('Completed', 'Cancelled')");
    }
    if (sp.get("department")) { conditions.push("d.name = ?"); params.push(sp.get("department")); }
    if (sp.get("product")) { conditions.push("pr.name = ?"); params.push(sp.get("product")); }
    if (sp.get("q")) {
      const q = `%${sp.get("q")}%`;
      conditions.push(
        `(p.planning_number LIKE ? OR pr.name LIKE ? OR d.name LIKE ? OR p.status LIKE ?
          OR EXISTS (
            SELECT 1 FROM party_allocations pa2
            JOIN parties pt2 ON pt2.id = pa2.party_id
            WHERE pa2.production_plan_id = p.id AND pt2.name LIKE ?
          ))`
      );
      params.push(q, q, q, q, q);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query<Row[]>(
      `SELECT p.*, pr.name AS product_name, d.name AS department_name,
        (SELECT GROUP_CONCAT(pt.name ORDER BY pa.id SEPARATOR ', ')
         FROM party_allocations pa
         JOIN parties pt ON pt.id = pa.party_id
         WHERE pa.production_plan_id = p.id) AS client_names
       FROM production_plans p
       JOIN products pr ON pr.id = p.product_id
       JOIN departments d ON d.id = p.department_id
       ${where}
       ORDER BY p.plan_date DESC, p.id DESC`,
      params
    );

    return NextResponse.json({ plans: rows });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Resolve product & department by name (or create if missing)
    let productId = body.product_id;
    if (!productId && body.product_name) {
      const [pr] = await pool.query<Row[]>(`SELECT id FROM products WHERE name = ? LIMIT 1`, [body.product_name]);
      if (pr.length) productId = pr[0].id;
      else {
        const [ins] = await pool.query<Result>(`INSERT INTO products (name) VALUES (?)`, [body.product_name]);
        productId = ins.insertId;
      }
    }

    let departmentId = body.department_id;
    if (!departmentId && body.department_name) {
      const [dr] = await pool.query<Row[]>(`SELECT id FROM departments WHERE name = ? LIMIT 1`, [body.department_name]);
      if (dr.length) departmentId = dr[0].id;
      else {
        const [ins] = await pool.query<Result>(`INSERT INTO departments (name) VALUES (?)`, [body.department_name]);
        departmentId = ins.insertId;
      }
    }

    if (!productId || !departmentId) {
      return NextResponse.json({ error: "Product and Department are required" }, { status: 400 });
    }

    // Generate planning number if auto
    let planningNumber = body.planning_number;
    if (!planningNumber || planningNumber === "Auto Generate") {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const [cnt] = await pool.query<Row[]>(
        `SELECT COUNT(*) AS c FROM production_plans WHERE plan_date = CURDATE()`
      );
      const seq = String(Number((cnt[0] as any).c) + 1).padStart(3, "0");
      planningNumber = `P_${y}${m}${day}_${seq}`;
    }

    const [result] = await pool.query<Result>(
      `INSERT INTO production_plans (
        planning_number, product_id, department_id,
        width_mm, thickness_micron, density, weight_kg, calculated_length,
        apply_scrapping, scrap_width_cm, scrap_weight_kg, scrap_length_m, scrap_percentage,
        total_input_kg, total_expected_kg, waste_kg, waste_percentage, productivity_pct, net_length_m,
        status, plan_date, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),?)`,
      [
        planningNumber,
        productId,
        departmentId,
        body.width_mm || 0,
        body.thickness_micron || 0,
        body.density || 0,
        body.weight_kg || 0,
        body.calculated_length || 0,
        body.apply_scrapping ? 1 : 0,
        body.scrap_width_cm || null,
        body.scrap_weight_kg || 0,
        body.scrap_length_m || 0,
        body.scrap_percentage || 0,
        body.total_input_kg || body.weight_kg || 0,
        body.total_expected_kg || 0,
        body.waste_kg || 0,
        body.waste_percentage || 0,
        body.productivity_pct || 0,
        body.net_length_m || body.calculated_length || 0,
        body.status || "Draft",
        user.id,
      ]
    );

    const planId = result.insertId;

    // Party allocations
    if (Array.isArray(body.parties) && body.parties.length) {
      for (const party of body.parties) {
        if (!party.partyName && !party.party_id) continue;
        let partyId = party.party_id;
        if (!partyId && party.partyName) {
          const [pr] = await pool.query<Row[]>(`SELECT id FROM parties WHERE name = ? LIMIT 1`, [party.partyName]);
          if (pr.length) partyId = pr[0].id;
          else {
            const [ins] = await pool.query<Result>(`INSERT INTO parties (name) VALUES (?)`, [party.partyName]);
            partyId = ins.insertId;
          }
        }
        if (!partyId) continue;
        await pool.query(
          `INSERT INTO party_allocations (production_plan_id, party_id, width_mm, weight_kg, length_m)
           VALUES (?,?,?,?,?)`,
          [planId, partyId, party.widthMm || party.width_mm || 0, party.weightKg || party.weight_kg || 0, party.lengthM || party.length_m || 0]
        );
      }
    }

    return NextResponse.json({ ok: true, id: planId, planning_number: planningNumber });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
