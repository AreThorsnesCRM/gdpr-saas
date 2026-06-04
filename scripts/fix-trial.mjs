import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Les .env.local manuelt
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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const USER_EMAIL = "are.thorsnes@gmail.com";
const CORRECT_TRIAL_END = "2026-06-09T23:59:59.000Z";

const { data: users, error: userError } = await supabase.auth.admin.listUsers();
if (userError) { console.error("Feil ved henting av brukere:", userError.message); process.exit(1); }

const user = users.users.find((u) => u.email === USER_EMAIL);
if (!user) { console.error("Fant ikke bruker med e-post:", USER_EMAIL); process.exit(1); }

console.log("Fant bruker:", user.id);

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("account_id, trial_end")
  .eq("user_id", user.id)
  .single();

if (profileError) { console.error("Feil ved henting av profil:", profileError.message); process.exit(1); }

console.log("Nåværende trial_end:", profile.trial_end);
console.log("Setter trial_end til:", CORRECT_TRIAL_END);

const { error: pErr } = await supabase
  .from("profiles")
  .update({ trial_end: CORRECT_TRIAL_END })
  .eq("user_id", user.id);

if (pErr) { console.error("Feil ved oppdatering av profiles:", pErr.message); process.exit(1); }

if (profile.account_id) {
  const { error: aErr } = await supabase
    .from("accounts")
    .update({ trial_end: CORRECT_TRIAL_END })
    .eq("id", profile.account_id);

  if (aErr) { console.error("Feil ved oppdatering av accounts:", aErr.message); process.exit(1); }
}

console.log("✓ trial_end oppdatert til 9. juni 2026 i både profiles og accounts");
