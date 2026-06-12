import { NextResponse, type NextRequest } from "next/server";

// Origin isolation: prototype content runs on a different host than the portal
// so portal session cookies never reach user-uploaded HTML/JS. Enforced here
// in addition to per-route host checks (defense in depth).
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
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|healthz).*)"],
};
