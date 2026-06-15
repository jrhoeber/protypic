import { NextResponse, type NextRequest } from "next/server";

// Origin isolation: prototype content runs on a different host than the portal
// so portal session cookies never reach user-uploaded HTML/JS. Enforced here
// in addition to per-route host checks (defense in depth).
//
// Portal-only security headers are also set here. They are deliberately NOT
// applied to VIEW_HOST: prototype HTML is uploaded by users and is expected
// to execute its own JS — CSP/X-Frame-Options on prototype responses would
// break the product. The streaming route at app/p/[guid]/[...path] sets its
// own minimal headers (nosniff + no-referrer + private cache).
export function middleware(req: NextRequest) {
  const portalHost = process.env.PORTAL_HOST?.toLowerCase();
  const viewHost = process.env.VIEW_HOST?.toLowerCase();
  if (!portalHost || !viewHost) return NextResponse.next();

  const host = (req.headers.get("host") ?? "").split(":")[0]!.toLowerCase();
  const path = req.nextUrl.pathname;
  const isPrototype = path === "/p" || path.startsWith("/p/");

  if (host === viewHost && !isPrototype) {
    return new NextResponse("Not Found", { status: 404 });
  }
  if (host === portalHost && isPrototype) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const res = NextResponse.next();
  // Apply hardening headers only in prod. Next.js dev uses eval() for HMR /
  // Fast Refresh, so a strict script-src (without 'unsafe-eval') silently
  // breaks client-component hydration — observed locally as the dashboard
  // rendering but its Sign out button's onClick never firing. The headers
  // are prod hardening anyway; localhost doesn't need them.
  if (host === portalHost && process.env.NODE_ENV === "production") {
    applyPortalSecurityHeaders(res);
  }
  return res;
}

function applyPortalSecurityHeaders(res: NextResponse): void {
  // 2 years, with subdomains and preload — view.protypic.ai is in the same
  // registrable domain and we want HSTS to cover it too.
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  // The portal uses Firebase Auth via signInWithPopup, which loads scripts
  // from apis.google.com and the project's *.firebaseapp.com auth domain.
  // Identity Toolkit + Secure Token + Firestore REST sit under googleapis.com.
  // 'unsafe-inline' for style covers React's inline `style={{}}` attribute;
  // for script it covers Next.js hydration shim. Tightening to nonces is a
  // follow-up.
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
    "connect-src 'self' https://*.googleapis.com https://securetoken.googleapis.com",
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
    "form-action 'self'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|healthz).*)"],
};
