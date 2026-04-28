import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const accessToken = req.cookies.get("sb-access-token")?.value;

  // Hvis ingen token → redirect til login
  if (!accessToken) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Hent JWT claims fra header (Supabase legger dem inn automatisk)
  const jwt = req.headers.get("x-supabase-auth-token");
  if (!jwt) return NextResponse.next();

  // Parse JWT payload
  const payload = JSON.parse(
    Buffer.from(jwt.split(".")[1], "base64").toString()
  );

  const status = payload.subscription_status;
  const trialEnd = payload.trial_end ? new Date(payload.trial_end) : null;

  // Trial expired?
  if (status === "trialing" && trialEnd && new Date() > trialEnd) {
    console.log("[middleware] Trial expired, redirecting to upgrade");
    url.pathname = "/billing/upgrade";
    return NextResponse.redirect(url);
  }

  // Past due → må oppdatere betalingsmetode
  if (status === "past_due") {
    console.log("[middleware] Subscription past due, redirecting to payment-required");
    url.pathname = "/billing/payment-required";
    return NextResponse.redirect(url);
  }

  // Canceled → må kjøpe abonnement
  if (status === "canceled") {
    console.log("[middleware] Subscription canceled, redirecting to upgrade");
    url.pathname = "/billing/upgrade";
    return NextResponse.redirect(url);
  }

  // Incomplete / unpaid → send til checkout
  if (status === "incomplete" || status === "unpaid") {
    console.log("[middleware] Subscription incomplete/unpaid, redirecting to upgrade");
    url.pathname = "/billing/upgrade";
    return NextResponse.redirect(url);
  }

  // active eller trialing (og ikke expired) → tillat videre
  console.log("[middleware] Subscription status:", status, "- allowing access");
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/customers/:path*", "/agreements/:path*", "/settings/:path*", "/billing/:path*"],
};
