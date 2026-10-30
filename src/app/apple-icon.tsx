import { ImageResponse } from "next/og";

import { LogomarkImage } from "@/components/system/logomark-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<LogomarkImage size={size.width} />, { ...size });
}
