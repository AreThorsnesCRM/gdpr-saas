import Stripe from "stripe"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

serve(async (req) => {
  try {
    const { user_id } = await req.json()

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: Deno.env.get("STRIPE_PRICE_ID")!,
          quantity: 1,
        },
      ],
      success_url: `${Deno.env.get("SITE_URL")}/dashboard`,
      cancel_url: `${Deno.env.get("SITE_URL")}/subscribe`,
      client_reference_id: user_id,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
    })
  }
})
