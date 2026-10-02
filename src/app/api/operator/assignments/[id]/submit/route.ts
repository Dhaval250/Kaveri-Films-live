import { NextRequest, NextResponse } from "next/server";
import { pool, Row } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const [asgRows] = await pool.query<Row[]>(
      `SELECT * FROM production_assignments WHERE id = ?`,
      [params.id]
    );
    if (!asgRows.length) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    const asg = asgRows[0] as any;

    const status = body.status === "Draft" ? "Draft" : "Submitted";
    await pool.query(
      `INSERT INTO production_records
       (assignment_id, production_plan_id, operator_id, input_weight_kg, output_weight_kg,
        actual_length_m, waste_weight_kg, waste_percentage, actual_width_mm, actual_thickness_micron,
        remarks, status, submitted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, ${status === "Submitted" ? "NOW()" : "NULL"})`,
      [
        params.id, asg.production_plan_id, user.id,
        body.input_weight_kg, body.output_weight_kg, body.actual_length_m,
        body.waste_weight_kg || 0, body.waste_percentage || 0,
        body.actual_width_mm, body.actual_thickness_micron,
        body.remarks || null, status,
      ]
    );

    if (status === "Submitted") {
      await pool.query(
        `UPDATE production_assignments SET status = 'Submitted' WHERE id = ?`,
        [params.id]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
