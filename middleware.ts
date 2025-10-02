import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Only apply role-based rewrites on GET navigations
    // Avoid interfering with POST requests (e.g., Server Actions form submissions)
    if (req.method !== 'GET') {
      return NextResponse.next();
    }

    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Role-based route protection
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }

    if (pathname.startsWith("/manager") && !["ADMIN", "MANAGER"].includes(token?.role as string)) {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }

    if (pathname.startsWith("/accounts") && !["ADMIN", "ACCOUNTS", "ACCOUNTANT"].includes(token?.role as string)) {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/manager/:path*",
    "/accounts/:path*",
    "/receivables/:path*",
    "/sales/:path*",
    "/api/protected/:path*",
  ],
};