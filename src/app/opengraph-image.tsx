import { ImageResponse } from "next/og";

import { LogomarkImage } from "@/components/system/logomark-image";
import { openGraphAlt, siteName, siteTagline } from "@/lib/seo";

export const alt = openGraphAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(165deg, #F6F7FF 0%, #E8ECFF 42%, #F7F7F8 100%)",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <LogomarkImage size={88} />
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              color: "#171717",
              letterSpacing: -0.6,
            }}
          >
            {siteName}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 860 }}>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.8,
              color: "#141414",
            }}
          >
            Run the floor from one calm workspace.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              lineHeight: 1.35,
              color: "#4A5168",
            }}
          >
            {siteTagline}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
