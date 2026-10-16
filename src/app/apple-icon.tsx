import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon (no transparency: iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#8b5cf6,#22d3ee)" }}>
        <div style={{ width: 106, height: 106, borderRadius: 999, border: "8px solid rgba(255,255,255,0.78)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: "white" }} />
        </div>
      </div>
    ),
    size,
  );
}
