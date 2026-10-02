import { NextRequest, NextResponse } from "next/server";
import { pool, Row, Result } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function ensureDensityColumn() {
  try {
    await pool.query(
      `ALTER TABLE products ADD COLUMN density DECIMAL(10,4) NOT NULL DEFAULT 1.3900`
    );
  } catch {
    // column already exists
  }
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureDensityColumn();
    const [rows] = await pool.query<Row[]>(
      `SELECT id, name, density, is_active, created_at FROM products ORDER BY name`
    );
    return NextResponse.json({ products: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureDensityColumn();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const density = parseFloat(body.density);
    if (!name) return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    if (!density || density <= 0) {
      return NextResponse.json({ error: "Density (g/cc) is required and must be > 0" }, { status: 400 });
    }

    const [existing] = await pool.query<Row[]>(
      `SELECT id FROM products WHERE name = ? LIMIT 1`,
      [name]
    );
    if (existing.length) {
      return NextResponse.json({ error: "Product already exists" }, { status: 400 });
    }

    const [ins] = await pool.query<Result>(
      `INSERT INTO products (name, density, is_active) VALUES (?, ?, 1)`,
      [name, density]
    );
    return NextResponse.json({ ok: true, id: ins.insertId, name, density });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureDensityColumn();
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
      const [dup] = await pool.query<Row[]>(
        `SELECT id FROM products WHERE name = ? AND id != ? LIMIT 1`,
        [name, id]
      );
      if (dup.length) {
        return NextResponse.json({ error: "Product name already exists" }, { status: 400 });
      }
      await pool.query(`UPDATE products SET name = ? WHERE id = ?`, [name, id]);
    }
    if (body.density != null) {
      const density = parseFloat(body.density);
      if (!density || density <= 0) {
        return NextResponse.json({ error: "Density must be > 0" }, { status: 400 });
      }
      await pool.query(`UPDATE products SET density = ? WHERE id = ?`, [density, id]);
    }
    if (body.is_active != null) {
      await pool.query(`UPDATE products SET is_active = ? WHERE id = ?`, [
        body.is_active ? 1 : 0,
        id,
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    const hard = req.nextUrl.searchParams.get("hard") === "1";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Block hard delete if product is used in any production plan
    if (hard) {
      const [used] = await pool.query<Row[]>(
        `SELECT COUNT(*) AS c FROM production_plans WHERE product_id = ?`,
        [id]
      );
      const count = Number((used as any)[0]?.c || 0);
      if (count > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete this product. It is assigned to ${count} production plan(s). Deactivate it instead.`,
          },
          { status: 400 }
        );
      }
      await pool.query(`DELETE FROM products WHERE id = ?`, [id]);
    } else {
      await pool.query(`UPDATE products SET is_active = 0 WHERE id = ?`, [id]);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
