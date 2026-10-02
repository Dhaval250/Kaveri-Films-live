import { NextRequest, NextResponse } from "next/server";
import { pool, Row } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const role = String(user.role || "");
    const isOperatorOnly = role === "Operator";
    // Operator login: only their assigned work. Admin/Manager can see all (with operator name).
    const history = sp.get("history") === "1";

    const conditions: string[] = [];
    const params: any[] = [];

    if (isOperatorOnly || sp.get("mine") === "1") {
      conditions.push("a.operator_id = ?");
      params.push(user.id);
    }

    if (history) {
      conditions.push("a.status IN ('Submitted', 'Completed')");
    } else if (sp.get("status")) {
      conditions.push("a.status = ?");
      params.push(sp.get("status"));
    }

    if (sp.get("status") && history) {
      // override history default with specific status
      conditions.pop();
      conditions.push("a.status = ?");
      params.push(sp.get("status"));
    }

    if (sp.get("product")) {
      conditions.push("pr.name = ?");
      params.push(sp.get("product"));
    }
    if (sp.get("client")) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM party_allocations pa2
          JOIN parties pt2 ON pt2.id = pa2.party_id
          WHERE pa2.production_plan_id = p.id AND pt2.name = ?
        )`
      );
      params.push(sp.get("client"));
    }
    if (sp.get("machine")) {
      conditions.push("m.name = ?");
      params.push(sp.get("machine"));
    }
    if (sp.get("shift")) {
      conditions.push("s.name = ?");
      params.push(sp.get("shift"));
    }
    if (sp.get("q")) {
      const q = `%${sp.get("q")}%`;
      conditions.push(
        `(p.planning_number LIKE ? OR pr.name LIKE ? OR d.name LIKE ? OR a.status LIKE ?
          OR m.name LIKE ? OR s.name LIKE ? OR uo.name LIKE ?
          OR EXISTS (
            SELECT 1 FROM party_allocations pa2
            JOIN parties pt2 ON pt2.id = pa2.party_id
            WHERE pa2.production_plan_id = p.id AND pt2.name LIKE ?
          ))`
      );
      params.push(q, q, q, q, q, q, q, q);
    }
    if (sp.get("from")) {
      conditions.push("a.start_date >= ?");
      params.push(sp.get("from"));
    }
    if (sp.get("to")) {
      conditions.push("a.start_date <= ?");
      params.push(sp.get("to"));
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query<Row[]>(
      `SELECT a.id, a.status, a.start_date, a.production_plan_id, a.operator_id,
        p.planning_number, p.weight_kg AS planned_weight_kg,
        p.net_length_m AS planned_length_m, p.calculated_length,
        pr.name AS product_name, d.name AS department_name,
        m.name AS machine_name, s.name AS shift_name,
        CONCAT(TIME_FORMAT(s.start_time,'%h:%i %p'),' - ',TIME_FORMAT(s.end_time,'%h:%i %p')) AS shift_time,
        u.name AS manager_name,
        uo.name AS operator_name,
        (SELECT GROUP_CONCAT(pt.name ORDER BY pa.id SEPARATOR ', ')
         FROM party_allocations pa
         JOIN parties pt ON pt.id = pa.party_id
         WHERE pa.production_plan_id = p.id) AS client_names
       FROM production_assignments a
       JOIN production_plans p ON p.id = a.production_plan_id
       JOIN products pr ON pr.id = p.product_id
       LEFT JOIN departments d ON d.id = p.department_id
       JOIN machines m ON m.id = a.machine_id
       JOIN shifts s ON s.id = a.shift_id
       JOIN users u ON u.id = a.shift_manager_id
       LEFT JOIN users uo ON uo.id = a.operator_id
       ${where}
       ORDER BY a.start_date DESC, a.id DESC`,
      params
    );

    const list = rows as any[];
    const counts = {
      total: list.length,
      progress: list.filter((x) => x.status === "In Progress").length,
      submitted: list.filter((x) => x.status === "Submitted").length,
      completed: list.filter((x) => x.status === "Completed").length,
      hold: list.filter((x) => x.status === "On Hold").length,
    };

    const [products] = await pool.query<Row[]>(
      `SELECT id, name FROM products WHERE is_active = 1 ORDER BY name`
    );
    const [parties] = await pool.query<Row[]>(
      `SELECT id, name FROM parties WHERE is_active = 1 ORDER BY name`
    );
    const [machines] = await pool.query<Row[]>(
      `SELECT id, name FROM machines WHERE is_active = 1 ORDER BY name`
    );
    const [shifts] = await pool.query<Row[]>(
      `SELECT id, name FROM shifts WHERE is_active = 1 ORDER BY name`
    );

    return NextResponse.json({
      assignments: list,
      counts,
      products: products || [],
      parties: parties || [],
      machines: machines || [],
      shifts: shifts || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
