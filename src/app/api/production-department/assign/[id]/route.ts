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

async function safeQuery(sql: string, params: any[] = []): Promise<any[]> {
  try {
    const [rows] = await pool.query<Row[]>(sql, params);
    return rows as any[];
  } catch (e: any) {
    console.error("SQL error:", e.message, sql);
    return [];
  }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = await resolveId(params);

    const plans = await safeQuery(
      `SELECT p.*, pr.name AS product_name, d.name AS department_name
       FROM production_plans p
       LEFT JOIN products pr ON pr.id = p.product_id
       LEFT JOIN departments d ON d.id = p.department_id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );
    if (!plans.length) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Parallel load — faster than sequential queries
    const [assignments, records, parties, managers, operators, machines, shifts] =
      await Promise.all([
        safeQuery(
          `SELECT a.*, um.name AS manager_name, uo.name AS operator_name,
            m.name AS machine_name, s.name AS shift_name
           FROM production_assignments a
           LEFT JOIN users um ON um.id = a.shift_manager_id
           LEFT JOIN users uo ON uo.id = a.operator_id
           LEFT JOIN machines m ON m.id = a.machine_id
           LEFT JOIN shifts s ON s.id = a.shift_id
           WHERE a.production_plan_id = ?
           ORDER BY a.id`,
          [id]
        ),
        safeQuery(
          `SELECT r.*, uo.name AS operator_name, um.name AS manager_name, s.name AS shift_name,
            a.start_date, a.start_time, a.actual_start_datetime
           FROM production_records r
           LEFT JOIN production_assignments a ON a.id = r.assignment_id
           LEFT JOIN users uo ON uo.id = r.operator_id
           LEFT JOIN users um ON um.id = a.shift_manager_id
           LEFT JOIN shifts s ON s.id = a.shift_id
           WHERE r.production_plan_id = ?
           ORDER BY r.id`,
          [id]
        ),
        safeQuery(
          `SELECT pa.*, pt.name AS party_name
           FROM party_allocations pa
           LEFT JOIN parties pt ON pt.id = pa.party_id
           WHERE pa.production_plan_id = ?
           ORDER BY pa.id`,
          [id]
        ),
        safeQuery(
          `SELECT id, name, email, role FROM users
           WHERE role IN ('Shift Manager','Super Admin','Admin')
           ORDER BY name`
        ),
        safeQuery(
          `SELECT id, name, email, role FROM users
           WHERE role = 'Operator'
           ORDER BY name`
        ),
        safeQuery(`SELECT id, name, department_id FROM machines ORDER BY name`),
        safeQuery(`SELECT id, name, start_time, end_time FROM shifts ORDER BY name`),
      ]);

    return NextResponse.json({
      plan: plans[0],
      assignments,
      records,
      parties,
      masters: { managers, operators, machines, shifts },
    });
  } catch (e: any) {
    console.error("assign GET error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = await resolveId(params);
    const body = await req.json();

    if (body.action === "assign") {
      if (
        !body.shift_manager_id ||
        !body.shift_id ||
        !body.machine_id ||
        !body.operator_id
      ) {
        return NextResponse.json(
          { error: "All required assignment fields must be filled" },
          { status: 400 }
        );
      }

      const startDate =
        body.start_date || new Date().toISOString().slice(0, 10);
      const startTime =
        body.start_time || new Date().toTimeString().slice(0, 5);

      await pool.query(
        `INSERT INTO production_assignments
         (production_plan_id, shift_manager_id, shift_id, machine_id, operator_id,
          start_date, start_time, is_shift_change, remarks, status, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,'Not Started',?)`,
        [
          id,
          body.shift_manager_id,
          body.shift_id,
          body.machine_id,
          body.operator_id,
          startDate,
          startTime,
          body.is_shift_change ? 1 : 0,
          body.remarks || null,
          user.id,
        ]
      );
      const planStatus = body.plan_status || "In Progress";
      await pool.query(
        `UPDATE production_plans SET status = ?
         WHERE id = ? AND status IN ('Ready for Production','Planned','In Progress','Partially Completed','On Hold')`,
        [planStatus, id]
      );
      return NextResponse.json({ ok: true, plan_status: planStatus });
    }

    if (body.action === "final") {
      await pool.query(`UPDATE production_plans SET status = 'Completed' WHERE id = ?`, [id]);
      await pool.query(
        `UPDATE production_assignments SET status = 'Completed' WHERE production_plan_id = ?`,
        [id]
      );
      if (body.manager_remarks) {
        await pool.query(
          `UPDATE production_records SET manager_remarks = ?, status = 'Approved', reviewed_at = NOW()
           WHERE production_plan_id = ? AND status = 'Submitted'`,
          [body.manager_remarks, id]
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("assign POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
