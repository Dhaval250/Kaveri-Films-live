import { NextRequest, NextResponse } from "next/server";
import { pool, Row, Result } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

const ROLES = ["Super Admin", "Admin", "Shift Manager", "Operator"];

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Super Admin", "Admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [rows] = await pool.query<Row[]>(
      `SELECT id, name, email, role, is_active, created_at FROM users ORDER BY name`
    );
    return NextResponse.json({ users: rows, roles: ROLES });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Super Admin", "Admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "Operator");

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const [existing] = await pool.query<Row[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (existing.length) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hash = await hashPassword(password);
    const [ins] = await pool.query<Result>(
      `INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, 1)`,
      [name, email, hash, role]
    );
    return NextResponse.json({ ok: true, id: ins.insertId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Super Admin", "Admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (body.name != null) {
      await pool.query(`UPDATE users SET name = ? WHERE id = ?`, [
        String(body.name).trim(),
        id,
      ]);
    }
    if (body.email != null) {
      const email = String(body.email).trim().toLowerCase();
      const [dup] = await pool.query<Row[]>(
        `SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1`,
        [email, id]
      );
      if (dup.length) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
      await pool.query(`UPDATE users SET email = ? WHERE id = ?`, [email, id]);
    }
    if (body.role != null && ROLES.includes(body.role)) {
      await pool.query(`UPDATE users SET role = ? WHERE id = ?`, [body.role, id]);
    }
    if (body.is_active != null) {
      await pool.query(`UPDATE users SET is_active = ? WHERE id = ?`, [
        body.is_active ? 1 : 0,
        id,
      ]);
    }
    if (body.password && String(body.password).length >= 4) {
      const hash = await hashPassword(String(body.password));
      await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hash, id]);
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
    if (!["Super Admin", "Admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (Number(id) === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await pool.query(`UPDATE users SET is_active = 0 WHERE id = ?`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
