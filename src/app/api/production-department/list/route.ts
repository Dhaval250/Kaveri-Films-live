import { NextRequest, NextResponse } from "next/server";
import { pool, Row } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const conditions: string[] = ["p.status NOT IN ('Draft')"];
    const params: any[] = [];

    if (sp.get("from")) {
      conditions.push("p.plan_date >= ?");
      params.push(sp.get("from"));
    }
    if (sp.get("to")) {
      conditions.push("p.plan_date <= ?");
      params.push(sp.get("to"));
    }
    if (sp.get("status")) {
      conditions.push("p.status = ?");
      params.push(sp.get("status"));
    } else if (sp.get("history") === "1") {
      // History: completed / cancelled only
      conditions.push("p.status IN ('Completed', 'Cancelled')");
    } else {
      // Active production list: hide completed & cancelled
      conditions.push("p.status NOT IN ('Completed', 'Cancelled')");
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
      `SELECT p.*,
              pr.name AS product_name,
              d.name AS department_name,
              (SELECT GROUP_CONCAT(pt.name ORDER BY pa.id SEPARATOR ', ')
               FROM party_allocations pa
               JOIN parties pt ON pt.id = pa.party_id
               WHERE pa.production_plan_id = p.id) AS client_names
       FROM production_plans p
       JOIN products pr ON pr.id = p.product_id
       LEFT JOIN departments d ON d.id = p.department_id
       ${where}
       ORDER BY p.plan_date DESC, p.id DESC`,
      params
    );

    const list = rows as any[];
    const counts = {
      ready: list.filter((x) => x.status === "Ready for Production").length,
      progress: list.filter((x) => x.status === "In Progress").length,
      partial: list.filter((x) => x.status === "Partially Completed").length,
      completed: list.filter((x) => x.status === "Completed").length,
      hold: list.filter((x) => x.status === "On Hold").length,
      cancelled: list.filter((x) => x.status === "Cancelled").length,
    };

    // Parties for client filter dropdown
    const [parties] = await pool.query<Row[]>(
      `SELECT id, name FROM parties WHERE is_active = 1 ORDER BY name`
    );

    // Products for product filter
    const [products] = await pool.query<Row[]>(
      `SELECT id, name FROM products WHERE is_active = 1 ORDER BY name`
    );

    return NextResponse.json({
      plans: list,
      counts,
      parties: parties || [],
      products: products || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
