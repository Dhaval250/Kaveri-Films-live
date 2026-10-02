import { NextRequest, NextResponse } from "next/server";
import { pool, Row, Result } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ACCESS_MODULES } from "@/lib/access-modules";

async function ensureRolesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`roles\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(100) NOT NULL,
      \`description\` VARCHAR(255) NULL,
      \`permissions\` TEXT NOT NULL,
      \`is_system\` TINYINT(1) NOT NULL DEFAULT 0,
      \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_roles_name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [rows] = await pool.query<Row[]>(`SELECT COUNT(*) AS c FROM roles`);
  if (Number(rows[0]?.c || 0) === 0) {
    const defaults = [
      {
        name: "Super Admin",
        description: "Full system access",
        permissions: ACCESS_MODULES.map((m) => m.key),
        is_system: 1,
      },
      {
        name: "Admin",
        description: "Admin without role management",
        permissions: ACCESS_MODULES.map((m) => m.key).filter((k) => k !== "roles"),
        is_system: 1,
      },
      {
        name: "Shift Manager",
        description: "Planning and production department",
        permissions: [
          "dashboard",
          "production_planning",
          "products",
          "production_department",
          "reports",
          "profile",
        ],
        is_system: 1,
      },
      {
        name: "Operator",
        description: "Operator assignments only",
        permissions: ["dashboard", "my_assignments", "work_history", "profile"],
        is_system: 1,
      },
    ];
    for (const r of defaults) {
      await pool.query(
        `INSERT INTO roles (name, description, permissions, is_system, is_active) VALUES (?, ?, ?, ?, 1)`,
        [r.name, r.description, JSON.stringify(r.permissions), r.is_system]
      );
    }
  }
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["Super Admin", "Admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureRolesTable();
    const [rows] = await pool.query<Row[]>(
      `SELECT id, name, description, permissions, is_system, is_active, created_at FROM roles ORDER BY is_system DESC, name`
    );
    const roles = rows.map((r) => ({
      ...r,
      permissions:
        typeof r.permissions === "string"
          ? JSON.parse(r.permissions || "[]")
          : r.permissions || [],
    }));
    return NextResponse.json({ roles, modules: ACCESS_MODULES });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureRolesTable();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const permissions = Array.isArray(body.permissions) ? body.permissions : [];

    if (!name) return NextResponse.json({ error: "Role name is required" }, { status: 400 });

    const [existing] = await pool.query<Row[]>(
      `SELECT id FROM roles WHERE name = ? LIMIT 1`,
      [name]
    );
    if (existing.length) {
      return NextResponse.json({ error: "Role already exists" }, { status: 400 });
    }

    const [ins] = await pool.query<Result>(
      `INSERT INTO roles (name, description, permissions, is_system, is_active) VALUES (?, ?, ?, 0, 1)`,
      [name, description, JSON.stringify(permissions)]
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
    if (user.role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureRolesTable();
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (body.name != null) {
      await pool.query(`UPDATE roles SET name = ? WHERE id = ? AND is_system = 0`, [
        String(body.name).trim(),
        id,
      ]);
    }
    if (body.description != null) {
      await pool.query(`UPDATE roles SET description = ? WHERE id = ?`, [
        String(body.description).trim(),
        id,
      ]);
    }
    if (body.permissions != null && Array.isArray(body.permissions)) {
      await pool.query(`UPDATE roles SET permissions = ? WHERE id = ?`, [
        JSON.stringify(body.permissions),
        id,
      ]);
    }
    if (body.is_active != null) {
      await pool.query(`UPDATE roles SET is_active = ? WHERE id = ? AND is_system = 0`, [
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
    if (user.role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureRolesTable();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const [rows] = await pool.query<Row[]>(
      `SELECT is_system FROM roles WHERE id = ? LIMIT 1`,
      [id]
    );
    if (rows[0]?.is_system) {
      return NextResponse.json({ error: "Cannot delete system role" }, { status: 400 });
    }
    await pool.query(`DELETE FROM roles WHERE id = ? AND is_system = 0`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
