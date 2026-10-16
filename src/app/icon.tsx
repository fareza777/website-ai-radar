import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Brand mark (radar ring + dot): the tab icon and the Organization logo in structured data. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 112, background: "#396bd8" }}>
        <div style={{ width: 300, height: 300, borderRadius: 999, border: "22px solid rgba(255,255,255,0.78)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: "white" }} />
        </div>
      </div>
    ),
    size,
  );
}
