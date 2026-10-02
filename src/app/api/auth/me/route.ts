import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool, Row } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rows] = await pool.query<Row[]>(
    `SELECT id, name, email, role, created_at AS createdAt, updated_at AS updatedAt
     FROM users WHERE id = ? LIMIT 1`,
    [session.id]
  );

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: Number(user.id),
      name: String(user.name),
      email: String(user.email),
      role: String(user.role),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
}
