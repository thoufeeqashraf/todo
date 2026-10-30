import { brandColor, brandColorDeep } from "@/lib/seo";

/** Satori-safe checklist mark. Icons wrap this element in ImageResponse. */
export function LogomarkImage({ size }: { size: number }) {
  const radius = Math.max(6, Math.round(size * 0.22));
  const glyph = Math.round(size * 0.58);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(160deg, ${brandColor} 0%, ${brandColorDeep} 100%)`,
        borderRadius: radius,
      }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5 9.2 16.7 19 7"
          stroke="#ffffff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
