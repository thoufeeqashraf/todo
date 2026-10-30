import { ImageResponse } from "next/og";

import { LogomarkImage } from "@/components/system/logomark-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<LogomarkImage size={size.width} />, { ...size });
}
