import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const proxy = auth((request) => {
  // Dashboard Keamanan selalu wajib login (data sensitif), apa pun nilai AUTH_REQUIRED; setelah masuk kembali ke halaman ini.
  if (request.nextUrl.pathname.startsWith("/keamanan") && !request.auth) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  // Dashboard lain dan katalog dapat dibaca publik; CMS memerlukan sesi bila AUTH_REQUIRED aktif.
  if (request.nextUrl.pathname.startsWith("/cms") && process.env.AUTH_REQUIRED === "true" && !request.auth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/cms/:path*", "/keamanan/:path*", "/keamanan"] };
