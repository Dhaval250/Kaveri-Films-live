import { NextRequest, NextResponse } from "next/server";
import { pool, Row } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const view = sp.get("view") || "plans";

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
    }
    if (sp.get("product")) {
      conditions.push("pr.name = ?");
      params.push(sp.get("product"));
    }
    if (sp.get("product_id")) {
      conditions.push("p.product_id = ?");
      params.push(sp.get("product_id"));
    }
    if (sp.get("shift")) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM production_assignments a
          WHERE a.production_plan_id = p.id AND a.shift_id = ?
        )`
      );
      params.push(sp.get("shift"));
    }
    if (sp.get("machine")) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM production_assignments a
          WHERE a.production_plan_id = p.id AND a.machine_id = ?
        )`
      );
      params.push(sp.get("machine"));
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

    const where = `WHERE ${conditions.join(" AND ")}`;

    const [rows] = await pool.query<Row[]>(
      `SELECT p.id, p.planning_number, p.status, p.plan_date,
              p.weight_kg, p.calculated_length, p.net_length_m,
              p.scrap_percentage, p.waste_kg, p.waste_percentage, p.productivity_pct,
              pr.name AS product_name,
              d.name AS department_name,
              (SELECT GROUP_CONCAT(pt.name ORDER BY pa.id SEPARATOR ', ')
               FROM party_allocations pa
               JOIN parties pt ON pt.id = pa.party_id
               WHERE pa.production_plan_id = p.id) AS client_names,
              (SELECT COALESCE(SUM(pa.weight_kg),0)
               FROM party_allocations pa WHERE pa.production_plan_id = p.id) AS client_weight_kg,
              (SELECT COUNT(*) FROM production_assignments a WHERE a.production_plan_id = p.id) AS assignment_count,
              (SELECT COUNT(*) FROM production_records r WHERE r.production_plan_id = p.id AND r.status IN ('Submitted','Approved')) AS record_count
       FROM production_plans p
       LEFT JOIN products pr ON pr.id = p.product_id
       LEFT JOIN departments d ON d.id = p.department_id
       ${where}
       ORDER BY p.plan_date DESC, p.id DESC`,
      params
    );

    const list = rows as any[];

    const summary = {
      totalPlans: list.length,
      totalWeight: list.reduce((s, x) => s + Number(x.weight_kg || 0), 0),
      totalLength: list.reduce(
        (s, x) => s + Number(x.net_length_m || x.calculated_length || 0),
        0
      ),
      totalClientWeight: list.reduce(
        (s, x) => s + Number(x.client_weight_kg || 0),
        0
      ),
      ready: list.filter((x) => x.status === "Ready for Production").length,
      inProgress: list.filter((x) => x.status === "In Progress").length,
      partial: list.filter((x) => x.status === "Partially Completed").length,
      completed: list.filter((x) => x.status === "Completed").length,
      onHold: list.filter((x) => x.status === "On Hold").length,
      cancelled: list.filter((x) => x.status === "Cancelled").length,
      avgScrap:
        list.length > 0
          ? list.reduce((s, x) => s + Number(x.scrap_percentage || 0), 0) / list.length
          : 0,
    };

    let clientRows: any[] = [];
    let productRows: any[] = [];
    let assignmentStats: Record<string, number> = {};
    let products: any[] = [];
    let parties: any[] = [];
    try {
      const [cr] = await pool.query<Row[]>(
      `SELECT pt.id, pt.name AS client_name,
              COUNT(DISTINCT p.id) AS plan_count,
              COALESCE(SUM(pa.weight_kg), 0) AS total_weight_kg,
              COALESCE(SUM(pa.length_m), 0) AS total_length_m,
              COALESCE(SUM(pa.width_mm), 0) AS total_width_mm,
              COUNT(pa.id) AS allocation_count,
              MAX(p.plan_date) AS last_plan_date
       FROM parties pt
       LEFT JOIN party_allocations pa ON pa.party_id = pt.id
       LEFT JOIN production_plans p ON p.id = pa.production_plan_id AND p.status NOT IN ('Draft')
       WHERE COALESCE(pt.is_active, 1) = 1
       GROUP BY pt.id, pt.name
       HAVING plan_count > 0 OR allocation_count > 0
       ORDER BY total_weight_kg DESC, pt.name`
      );
      clientRows = (cr as any[]) || [];
    } catch (e) { console.error("byClient", e); }

    try {
      const [pr] = await pool.query<Row[]>(
      `SELECT pr.id, pr.name AS product_name,
              COUNT(p.id) AS plan_count,
              COALESCE(SUM(p.weight_kg), 0) AS total_weight_kg,
              COALESCE(SUM(p.net_length_m), 0) AS total_length_m,
              COALESCE(AVG(p.scrap_percentage), 0) AS avg_scrap_pct,
              SUM(CASE WHEN p.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
              MAX(p.plan_date) AS last_plan_date
       FROM products pr
       LEFT JOIN production_plans p ON p.product_id = pr.id AND p.status NOT IN ('Draft')
       WHERE COALESCE(pr.is_active, 1) = 1
       GROUP BY pr.id, pr.name
       HAVING plan_count > 0
       ORDER BY total_weight_kg DESC, pr.name`
      );
      productRows = (pr as any[]) || [];
    } catch (e) { console.error("byProduct", e); }

    try {
      const [asgRows] = await pool.query<Row[]>(
        `SELECT a.status, COUNT(*) AS c FROM production_assignments a GROUP BY a.status`
      );
      (asgRows as any[]).forEach((r) => {
        assignmentStats[r.status] = Number(r.c);
      });
    } catch (e) { console.error("asgStats", e); }

    try {
      const [prows] = await pool.query<Row[]>(
        `SELECT id, name FROM products WHERE COALESCE(is_active, 1) = 1 ORDER BY name`
      );
      products = (prows as any[]) || [];
      const [parows] = await pool.query<Row[]>(
        `SELECT id, name FROM parties WHERE COALESCE(is_active, 1) = 1 ORDER BY name`
      );
      parties = (parows as any[]) || [];
    } catch (e) { console.error("masters lists", e); }

    return NextResponse.json({
      view,
      plans: list,
      summary,
      byClient: clientRows || [],
      byProduct: productRows || [],
      assignmentStats,
      products: products || [],
      parties: parties || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
