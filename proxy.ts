import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Dashboard dan katalog dapat dibaca publik. CMS saja yang memerlukan sesi login.
  const protectedPath = ["/cms","/pengajuan","/verifikasi","/gap-analysis","/master","/pengguna"].some((path) => request.nextUrl.pathname.startsWith(path));
  if (protectedPath && process.env.AUTH_REQUIRED === "true" && !request.cookies.get("spbe_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher:["/cms/:path*","/pengajuan/:path*","/verifikasi/:path*","/gap-analysis/:path*","/master/:path*","/pengguna/:path*"] };
