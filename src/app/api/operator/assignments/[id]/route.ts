import { NextRequest, NextResponse } from "next/server";
import { pool, Row } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

async function resolveId(params: Ctx["params"]) {
  const p =
    typeof params === "object" && params !== null && "then" in params
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string });
  return String(p.id);
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = await resolveId(params);

    const [rows] = await pool.query<Row[]>(
      `SELECT a.*, 
        m.name AS machine_name, s.name AS shift_name,
        CONCAT(TIME_FORMAT(s.start_time,'%h:%i %p'),' - ',TIME_FORMAT(s.end_time,'%h:%i %p')) AS shift_time,
        um.name AS manager_name, uo.name AS operator_name
       FROM production_assignments a
       JOIN machines m ON m.id = a.machine_id
       JOIN shifts s ON s.id = a.shift_id
       JOIN users um ON um.id = a.shift_manager_id
       JOIN users uo ON uo.id = a.operator_id
       WHERE a.id = ?`,
      [id]
    );
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const asg = rows[0] as any;

    const [plans] = await pool.query<Row[]>(
      `SELECT p.*, pr.name AS product_name, d.name AS department_name
       FROM production_plans p
       JOIN products pr ON pr.id = p.product_id
       JOIN departments d ON d.id = p.department_id
       WHERE p.id = ?`,
      [asg.production_plan_id]
    );

    const [parties] = await pool.query<Row[]>(
      `SELECT pa.*, pt.name AS party_name
       FROM party_allocations pa
       JOIN parties pt ON pt.id = pa.party_id
       WHERE pa.production_plan_id = ?
       ORDER BY pa.id`,
      [asg.production_plan_id]
    );

    const [recs] = await pool.query<Row[]>(
      `SELECT * FROM production_records WHERE assignment_id = ? ORDER BY id DESC`,
      [id]
    );

    return NextResponse.json({
      assignment: asg,
      plan: plans[0] || null,
      parties: parties || [],
      records: recs,
      latestRecord: recs[0] || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
