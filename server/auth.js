import jwt from "jsonwebtoken";
import { query } from "./db.js";

const COOKIE = "epc_admin";
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 16) throw new Error("JWT_SECRET must be set (16+ characters)");

export function setSession(res, admin) {
  const token = jwt.sign({ sub: admin.id, email: admin.email }, SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE);
}

export function readSession(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// The role comes from the database on every request, so changing or removing a user takes
// effect immediately rather than when their token expires.
export async function loadUser(req) {
  const session = readSession(req);
  if (!session) return null;
  const { rows } = await query(`select id, email, name, role from admins where id = $1`, [session.sub]);
  return rows[0] ?? null;
}

export async function requireAdmin(req, res, next) {
  const user = await loadUser(req);
  if (!user) {
    clearSession(res);
    return res.status(401).json({ error: "Not signed in" });
  }
  req.admin = { ...user, sub: user.id };
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin.role)) return res.status(403).json({ error: "You don't have permission to do that" });
  next();
};
