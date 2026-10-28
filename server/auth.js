import jwt from "jsonwebtoken";

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

export function requireAdmin(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: "Not signed in" });
  req.admin = session;
  next();
}
