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

export const proxy = auth((request) => {
  if (crossSite(request)) return new NextResponse("Forbidden", { status: 403 });
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

// Semua halaman yang memuat server action (CMS, akun, login) melewati pemeriksaan Origin di atas.
export const config = { matcher: ["/cms", "/cms/:path*", "/akun/:path*", "/keamanan/:path*", "/keamanan", "/login", "/design-system"] };
