import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { authRequired } from "@/lib/auth-mode";

export const proxy = auth((request) => {
  // Showcase design system hanya untuk pengembang (loading.tsx membuat notFound() di halaman tetap berstatus 200).
  if (request.nextUrl.pathname === "/design-system" && process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }
  // Dashboard Keamanan selalu wajib login (data sensitif); setelah masuk kembali ke halaman ini.
  if (request.nextUrl.pathname.startsWith("/keamanan") && !request.auth) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  // Ganti sandi selalu untuk pengguna yang sudah masuk.
  if (request.nextUrl.pathname.startsWith("/akun") && !request.auth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Dashboard lain dan katalog dapat dibaca publik; CMS selalu memerlukan sesi di production.
  if (request.nextUrl.pathname.startsWith("/cms") && authRequired && !request.auth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/cms/:path*", "/akun/:path*", "/keamanan/:path*", "/keamanan", "/design-system"] };
