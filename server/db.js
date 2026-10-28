import "dotenv/config";
import pg from "pg";

// Every table this app owns lives in its own schema, so the shared database's
// public/auth/storage schemas (used by the main ESOL Premier Campus app) are never touched.
export const SCHEMA = process.env.DB_SCHEMA || "epc_feedback";
if (!/^[a-z_][a-z0-9_]*$/.test(SCHEMA)) throw new Error(`Invalid DB_SCHEMA "${SCHEMA}"`);

const connectionString = process.env.DATABASE_POOLER_URL || process.env.DATABASE_CONNECTION_STRING;
if (!connectionString) throw new Error("DATABASE_POOLER_URL or DATABASE_CONNECTION_STRING must be set");

export const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  // Each Vercel function instance gets its own pool, so keep it to one connection there.
  max: process.env.VERCEL ? 1 : 5,
  idleTimeoutMillis: 30_000,
  // Pin search_path at connection startup so unqualified table names resolve to our schema only.
  options: `-c search_path=${SCHEMA},extensions`,
});

export const query = (text, params) => pool.query(text, params);
