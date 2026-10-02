import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await pool.query(
      `UPDATE production_assignments 
       SET status = 'In Progress', actual_start_datetime = ?, start_remarks = ?
       WHERE id = ?`,
      [body.actual_start_datetime?.replace("T", " ") + ":00", body.start_remarks || null, params.id]
    );

    // Update plan status if still Ready
    await pool.query(
      `UPDATE production_plans p
       JOIN production_assignments a ON a.production_plan_id = p.id
       SET p.status = 'In Progress'
       WHERE a.id = ? AND p.status IN ('Ready for Production','Planned')`,
      [params.id]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
