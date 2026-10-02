import { NextRequest, NextResponse } from "next/server";
import { pool, Row, Result } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [rows] = await pool.query<Row[]>(
      `SELECT p.*, pr.name AS product_name, d.name AS department_name
       FROM production_plans p
       JOIN products pr ON pr.id = p.product_id
       JOIN departments d ON d.id = p.department_id
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const [parties] = await pool.query<Row[]>(
      `SELECT pa.*, pt.name AS party_name
       FROM party_allocations pa
       JOIN parties pt ON pt.id = pa.party_id
       WHERE pa.production_plan_id = ?
       ORDER BY pa.id ASC`,
      [id]
    );

    return NextResponse.json({ plan: rows[0], parties });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // Resolve product & department by name
    let productId = body.product_id;
    if (!productId && body.product_name) {
      const [pr] = await pool.query<Row[]>(
        `SELECT id FROM products WHERE name = ? LIMIT 1`,
        [body.product_name]
      );
      if (pr.length) productId = pr[0].id;
      else {
        const [ins] = await pool.query<Result>(
          `INSERT INTO products (name) VALUES (?)`,
          [body.product_name]
        );
        productId = ins.insertId;
      }
    }

    let departmentId = body.department_id;
    if (!departmentId && body.department_name) {
      const [dr] = await pool.query<Row[]>(
        `SELECT id FROM departments WHERE name = ? LIMIT 1`,
        [body.department_name]
      );
      if (dr.length) departmentId = dr[0].id;
      else {
        const [ins] = await pool.query<Result>(
          `INSERT INTO departments (name) VALUES (?)`,
          [body.department_name]
        );
        departmentId = ins.insertId;
      }
    }

    await pool.query(
      `UPDATE production_plans SET
        product_id = COALESCE(?, product_id),
        department_id = COALESCE(?, department_id),
        width_mm = ?,
        thickness_micron = ?,
        density = ?,
        weight_kg = ?,
        calculated_length = ?,
        apply_scrapping = ?,
        scrap_width_cm = ?,
        scrap_weight_kg = ?,
        scrap_length_m = ?,
        scrap_percentage = ?,
        total_input_kg = ?,
        total_expected_kg = ?,
        waste_kg = ?,
        waste_percentage = ?,
        productivity_pct = ?,
        net_length_m = ?,
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        productId || null,
        departmentId || null,
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
        body.status || null,
        id,
      ]
    );

    // Replace party allocations
    if (Array.isArray(body.parties)) {
      await pool.query(`DELETE FROM party_allocations WHERE production_plan_id = ?`, [id]);
      for (const party of body.parties) {
        if (!party.partyName && !party.party_id) continue;
        let partyId = party.party_id;
        if (!partyId && party.partyName) {
          const [pr] = await pool.query<Row[]>(
            `SELECT id FROM parties WHERE name = ? LIMIT 1`,
            [party.partyName]
          );
          if (pr.length) partyId = pr[0].id;
          else {
            const [ins] = await pool.query<Result>(
              `INSERT INTO parties (name) VALUES (?)`,
              [party.partyName]
            );
            partyId = ins.insertId;
          }
        }
        if (!partyId) continue;
        await pool.query(
          `INSERT INTO party_allocations (production_plan_id, party_id, width_mm, weight_kg, length_m)
           VALUES (?,?,?,?,?)`,
          [
            id,
            partyId,
            party.widthMm || party.width_mm || 0,
            party.weightKg || party.weight_kg || 0,
            party.lengthM || party.length_m || 0,
          ]
        );
      }
    }

    return NextResponse.json({ ok: true, id: Number(id) });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await pool.query(`DELETE FROM party_allocations WHERE production_plan_id = ?`, [id]);
    await pool.query(`DELETE FROM production_plans WHERE id = ?`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
