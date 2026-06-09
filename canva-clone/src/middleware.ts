import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;

  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isAuthRoute =
    nextUrl.pathname.startsWith("/sign-in") ||
    nextUrl.pathname.startsWith("/sign-up") ||
    nextUrl.pathname.startsWith("/forgot-password");

  // Always allow API routes and auth routes through
  if (isApiRoute || isAuthRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to sign-in
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
