import { ImageResponse } from "next/og";
import { logoColors, logoSvg } from "@/components/brand/logo-geometry";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Gambar pratinjau saat tautan dibagikan (Google, WhatsApp, media sosial). Warna dari aset merek logo. */
export default function OpengraphImage() {
  const logo = `data:image/svg+xml;base64,${Buffer.from(logoSvg(220)).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", gap: 64, padding: 96, background: logoColors.tile, color: "white" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={220} height={220} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 28, color: logoColors.sky, letterSpacing: 2 }}>{siteConfig.organization.parent.toUpperCase()}</div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>{siteConfig.name}</div>
          <div style={{ fontSize: 30, color: logoColors.yellow }}>Sistem Pemerintahan Berbasis Elektronik 2025–2029</div>
        </div>
      </div>
    ),
    size,
  );
}
