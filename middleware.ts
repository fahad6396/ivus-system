import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/devices/:path*", "/add-device/:path*", "/ppm/:path*", "/activity/:path*"],
};