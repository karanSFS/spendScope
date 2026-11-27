import { NextResponse } from "next/server";

/**
 * Guest-first routing middleware.
 * - Private workspace routes (/dashboard, /transactions, /analytics, /spend-bucket,
 *   /categories, /calculators, /settings) are open to both Guests and Authenticated users.
 * - Legacy routes (/landing, /spend-budget, /calculators-m) redirect cleanly while
 *   preserving query parameters (e.g. ?type=emi-calculator&category=emi).
 */
export function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/landing") {
    return NextResponse.redirect(new URL(`/${search}`, request.url));
  }

  if (pathname === "/spend-budget") {
    return NextResponse.redirect(new URL(`/spend-bucket${search}`, request.url));
  }

  if (
    pathname === "/calculators-m" ||
    pathname === "/calculators-m/calculating"
  ) {
    return NextResponse.redirect(new URL(`/calculators${search}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
