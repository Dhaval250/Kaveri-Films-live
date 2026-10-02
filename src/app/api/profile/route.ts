import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  hashPassword,
  comparePassword,
  signToken,
  setAuthCookie,
} from "@/lib/auth";
import { pool, Row } from "@/lib/db";

// Update profile (name, email)
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const [existing] = await pool.query<Row[]>(
      "SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1",
      [email, session.id]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, session.id]
    );

    const updated = {
      id: session.id,
      name,
      email,
      role: session.role,
    };

    const token = signToken(updated);
    await setAuthCookie(token);

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// Change password
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const currentPassword = body.currentPassword || "";
    const newPassword = body.newPassword || "";
    const confirmPassword = body.confirmPassword || "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirm password do not match" },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<Row[]>(
      "SELECT id, password FROM users WHERE id = ? LIMIT 1",
      [session.id]
    );
    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await comparePassword(
      currentPassword,
      user.password as string
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(newPassword);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      hashed,
      session.id,
    ]);

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Password change error:", err);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
