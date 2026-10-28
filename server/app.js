import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import "./db.js";
import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/admin", adminRoutes);
app.use("/api", publicRoutes);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// On Vercel the built frontend is served by the CDN (see vercel.json); elsewhere Express serves it.
if (!process.env.VERCEL) {
  const dist = path.resolve(__dirname, "../dist");
  app.use(express.static(dist));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File is too large" });
  if (err.code === "22P02") return res.status(404).json({ error: "Not found" });
  res.status(500).json({ error: "Something went wrong" });
});

export default app;
