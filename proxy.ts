import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const proxy = auth((request) => {
  // Dashboard dan katalog dapat dibaca publik. CMS saja yang memerlukan sesi login.
  if (process.env.AUTH_REQUIRED === "true" && !request.auth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
});

export const config = { matcher:["/cms/:path*","/pengajuan/:path*","/verifikasi/:path*","/gap-analysis/:path*","/master/:path*","/pengguna/:path*"] };
