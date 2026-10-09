import { ImageResponse } from "next/og";

export const alt = "AI Radar — Your AI Intelligence Hub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "radial-gradient(900px 420px at 10% 0%, rgba(139,92,246,0.35), transparent 60%), radial-gradient(700px 360px at 100% 0%, rgba(34,211,238,0.22), transparent 60%), #111118",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, border: "3px solid rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: "white" }} />
            </div>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>AI Radar</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>Your AI Intelligence Hub</div>
        <div style={{ marginTop: 24, fontSize: 30, color: "rgba(255,255,255,0.72)", maxWidth: 960 }}>
          Automatic updates from 20 AI labs — models, features, APIs, pricing, promos & free credits — in one place.
        </div>
      </div>
    ),
    size,
  );
}
