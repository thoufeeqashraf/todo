import { NextResponse, type NextRequest } from "next/server";

import { ownerGateDocument, ownerPageStatus } from "@/lib/owner/page-access";
import { resolveOwnerPageClaim } from "@/lib/owner/page-claim";
import { CUSTOMER_SESSION_COOKIE, customerCookieAllows } from "@/lib/request-guards";
import { ADMIN_SESSION_COOKIE, readSessionToken } from "@/lib/session-token";

function ownerGateResponse(status: 401 | 403) {
  return new NextResponse(ownerGateDocument(status), {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isOwnerPage = pathname === "/owner" || pathname.startsWith("/owner/");
  if (isOwnerPage) {
    const status = await ownerPageStatus(
      request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value,
      resolveOwnerPageClaim,
    );
    if (status !== 200) return ownerGateResponse(status);
  }

  const session = await readSessionToken(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isCustomer = pathname === "/customer" || pathname.startsWith("/customer/");
  if (isCustomer && !customerCookieAllows(request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value)) {
    const url = request.nextUrl.clone();
    url.pathname = "/customer-login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isDashboard && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && session) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
