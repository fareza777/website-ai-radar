import { ImageResponse } from "next/og";
import { getLab, LABS } from "@/config/labs";
import { getLabItems } from "@/lib/data";
import { SITE, siteUrl } from "@/lib/site";

export const alt = "AI Radar — lab update timeline";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return LABS.map((l) => ({ slug: l.slug }));
}

/** Share card per lab: lab name and tagline on the lab's brand colour, plus the newest headline. */
export default async function LabOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lab = getLab(slug);
  const name = lab?.name ?? SITE.name;
  const color = lab?.color ?? "#8b5cf6";
  const latest = lab ? getLabItems(lab.slug)[0]?.title : undefined;
  const host = new URL(siteUrl()).host;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `radial-gradient(900px 460px at 0% 0%, ${color}66, transparent 60%), radial-gradient(700px 360px at 100% 100%, rgba(34,211,238,0.18), transparent 60%), #111118`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 700 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, border: "3px solid rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 7, height: 7, borderRadius: 999, background: "white" }} />
            </div>
          </div>
          {SITE.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>{name}</div>
          <div style={{ marginTop: 14, fontSize: 36, color: "rgba(255,255,255,0.75)" }}>{lab?.tagline ?? SITE.tagline}</div>
          {latest && <div style={{ marginTop: 34, fontSize: 28, color: "rgba(255,255,255,0.6)", maxWidth: 1000 }}>{`Latest: ${latest.length > 110 ? `${latest.slice(0, 107)}…` : latest}`}</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "rgba(255,255,255,0.55)" }}>
          <span>Update timeline · models, APIs, pricing, promos</span>
          <span>{host}</span>
        </div>
      </div>
    ),
    size,
  );
}
