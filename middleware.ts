import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Hent session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Hvis ikke logget inn → slipp gjennom (login-siden håndterer dette)
  if (!session) return res;

  const userId = session.user.id;

  // Hent profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, trial_end")
    .eq("user_id", userId)
    .single();

  if (!profile) return res;

  const status = profile.subscription_status;

  // Trial expired?
  if (status === "trialing" && profile.trial_end) {
    const now = new Date();
    const end = new Date(profile.trial_end);

    if (now > end) {
      return NextResponse.redirect(new URL("/billing/upgrade", req.url));
    }
  }

  // Past due → må oppdatere betalingsmetode
  if (status === "past_due") {
    return NextResponse.redirect(new URL("/billing/payment-required", req.url));
  }

  // Canceled → må kjøpe abonnement
  if (status === "canceled") {
    return NextResponse.redirect(new URL("/billing/upgrade", req.url));
  }

  // Incomplete / unpaid → send til checkout
  if (status === "incomplete" || status === "unpaid") {
    return NextResponse.redirect(new URL("/billing/upgrade", req.url));
  }

  return res;
}

// Aktiver middleware for dashboard-ruter
export const config = {
  matcher: ["/dashboard/:path*"],
};
