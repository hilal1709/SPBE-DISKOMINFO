import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { authRequired } from "@/lib/auth-mode";

/**
 * Lapis CSRF kedua untuk server action & form: request yang mengubah data (POST dsb.) wajib membawa Origin yang sama
 * dengan host situs. Next.js sendiri hanya memberi peringatan bila Origin tidak ada; di sini ditolak. Peramban modern
 * selalu mengirim Origin pada POST, jadi pengguna sah tidak terdampak.
 */
function crossSite(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true; // Origin "null" (iframe sandbox, file://) atau rusak.
  }
}

/** Perbandingan string konstan-waktu (tidak bocor lewat lamanya respons). */
function same(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/**
 * S4: versi pengembangan/staging bisa dikunci dengan HTTP Basic Auth lewat env SITE_PASSWORD (nama pengguna bebas).
 * Jangan diset di domain resmi. Tanpa env ini tidak ada perubahan perilaku.
 */
function siteLocked(request: Request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return true;
  try {
    const decoded = atob(header.slice(6));
    return !same(decoded.slice(decoded.indexOf(":") + 1), password);
  } catch {
    return true;
  }
}

export const proxy = auth((request) => {
  if (siteLocked(request)) {
    return new NextResponse("Akses versi pengembangan memerlukan sandi.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="SPBE Gresik (pengembangan)", charset="UTF-8"', "Cache-Control": "no-store" },
    });
  }
  if (crossSite(request)) return new NextResponse("Forbidden", { status: 403 });
  // Showcase design system hanya untuk pengembang (loading.tsx membuat notFound() di halaman tetap berstatus 200).
  if (request.nextUrl.pathname === "/design-system" && process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
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

// Semua halaman (kecuali aset statis) melewati proxy agar SITE_PASSWORD berlaku di seluruh situs; pemeriksaan Origin dan
// login di atas tetap hanya berdampak pada halaman yang mengubah data (CMS, akun, login).
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.webmanifest).*)"] };
