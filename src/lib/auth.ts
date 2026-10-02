import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { pool, Row } from "./db";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "kaveri-metallising-super-secret-key-change-in-production";
const COOKIE_NAME = "kaveri_token";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export function signToken(user: SessionUser): string {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const [rows] = await pool.query<Row[]>(
    "SELECT id, name, email, password, role, is_active FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];
  if (!user) return null;

  // Deactivated users cannot log in
  if (!Number(user.is_active)) return null;

  const ok = await comparePassword(password, user.password as string);
  if (!ok) return null;

  return {
    id: Number(user.id),
    name: String(user.name),
    email: String(user.email),
    role: String(user.role),
  };
}
