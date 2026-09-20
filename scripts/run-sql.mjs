// Runs a .sql file against the database using DATABASE_URL from .env.local.
// Usage: node scripts/run-sql.mjs supabase/migrations/0001_dpa_acceptances.sql
import { readFileSync } from "fs";
import { resolve } from "path";
import { Client } from "pg";

const envPath = resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#") && l.trim() !== "")
    .map((l) => {
      const idx = l.indexOf("=");
      const key = l.slice(0, idx).trim();
      const val = l.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      return [key, val];
    })
);

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Bruk: node scripts/run-sql.mjs <sti-til-sql-fil>");
  process.exit(1);
}
if (!env.DATABASE_URL) {
  console.error("DATABASE_URL mangler i .env.local");
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), sqlPath), "utf-8");

const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log(`✓ Kjørte ${sqlPath}`);
} finally {
  await client.end();
}
