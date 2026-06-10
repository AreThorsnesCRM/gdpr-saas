import Stripe from "stripe";
import { readFileSync } from "fs";
import { resolve } from "path";

// Les .env.local
const envPath = resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#") && l.trim() !== "")
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const packages = [
  { name: "5 signeringskreditter",  credits: 5,  amount: 17500 },
  { name: "10 signeringskreditter", credits: 10, amount: 31900 },
  { name: "20 signeringskreditter", credits: 20, amount: 57900 },
];

console.log("Oppretter Stripe-produkter for signeringskreditter...\n");

for (const pkg of packages) {
  const product = await stripe.products.create({
    name: pkg.name,
    metadata: { type: "signing_credits", credits: String(pkg.credits) },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: pkg.amount,
    currency: "nok",
    metadata: { type: "signing_credits", credits: String(pkg.credits) },
  });

  console.log(`✅ ${pkg.name}`);
  console.log(`   Produkt-ID: ${product.id}`);
  console.log(`   Pris-ID:    ${price.id}  ← legg til i Vercel`);
  console.log();
}

console.log("Legg disse i Vercel Environment Variables:");
console.log("  STRIPE_SIGNING_PRICE_5  = price_XXXX");
console.log("  STRIPE_SIGNING_PRICE_10 = price_XXXX");
console.log("  STRIPE_SIGNING_PRICE_20 = price_XXXX");
