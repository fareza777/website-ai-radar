import { afterEach, describe, expect, it, vi } from "vitest";
import { breadcrumbJsonLd, jsonLdString, pageMetadata, websiteJsonLd } from "../src/lib/seo";
import { siteUrl } from "../src/lib/site";

afterEach(() => vi.unstubAllEnvs());

describe("siteUrl follows the real domain", () => {
  it("prefers the attached production domain on a Vercel production build", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "airadarhub.top");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ai-radar-lilac.vercel.app");
    expect(siteUrl()).toBe("https://airadarhub.top");
  });

  it("uses NEXT_PUBLIC_SITE_URL outside production (trailing slash removed)", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "airadarhub.top");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.example.com/");
    expect(siteUrl()).toBe("https://staging.example.com");
  });

  it("falls back to the production URL, then localhost", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "airadarhub.top");
    expect(siteUrl()).toBe("https://airadarhub.top");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});

describe("pageMetadata", () => {
  const meta = pageMetadata({ title: "Deals & Free Credits", description: "desc", path: "/deals" });

  it("gives each page its own canonical, Open Graph and Twitter card", () => {
    expect(meta.alternates?.canonical).toBe("/deals");
    expect(meta.openGraph).toMatchObject({ title: "Deals & Free Credits · AI Radar", description: "desc", url: "/deals", type: "website" });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: "Deals & Free Credits · AI Radar" });
    expect(meta.robots).toBeUndefined();
  });

  it("keeps feed autodiscovery on every page and lets a page advertise its own Atom feed", () => {
    expect(meta.alternates?.types).toMatchObject({ "application/atom+xml": "/feed.xml", "application/feed+json": "/feed.json" });
    const lab = pageMetadata({ title: "OpenAI", description: "d", path: "/labs/openai", feed: "/labs/openai/feed.xml" });
    expect(lab.alternates?.types).toMatchObject({ "application/atom+xml": "/labs/openai/feed.xml" });
  });

  it("can mark a page noindex", () => {
    expect(pageMetadata({ title: "t", description: "d", path: "/x", noindex: true }).robots).toEqual({ index: false, follow: false });
  });
});

describe("structured data", () => {
  const base = "https://airadarhub.top";

  it("describes the site with a working sitelinks search target", () => {
    const graph = (websiteJsonLd(base)["@graph"] as Record<string, unknown>[]);
    const site = graph.find((n) => n["@type"] === "WebSite")!;
    expect(site.url).toBe(base);
    expect(site.potentialAction).toMatchObject({ target: { urlTemplate: `${base}/firehose?q={search_term_string}` } });
    expect(site.publisher).toEqual({ "@id": `${base}/#organization` });
    expect(graph.find((n) => n["@type"] === "Organization")?.["@id"]).toBe(`${base}/#organization`);
  });

  it("builds breadcrumbs that start at home with absolute, ordered items", () => {
    const list = breadcrumbJsonLd(base, [{ name: "AI Labs", path: "/labs" }, { name: "OpenAI", path: "/labs/openai" }]);
    expect(list.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "AI Radar", item: base },
      { "@type": "ListItem", position: 2, name: "AI Labs", item: `${base}/labs` },
      { "@type": "ListItem", position: 3, name: "OpenAI", item: `${base}/labs/openai` },
    ]);
  });

  it("escapes '<' so scraped text can never close the script tag", () => {
    const out = jsonLdString({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("share images", () => {
  it("re-attaches the site card on pages, and leaves pages with their own image alone", () => {
    const page = pageMetadata({ title: "Deals", description: "d", path: "/deals" });
    expect(page.openGraph).toMatchObject({ images: [{ url: "/opengraph-image", width: 1200, height: 630 }] });
    expect(page.twitter).toMatchObject({ images: ["/opengraph-image"] });
    const lab = pageMetadata({ title: "OpenAI", description: "d", path: "/labs/openai", image: null });
    expect((lab.openGraph as Record<string, unknown>).images).toBeUndefined();
    expect((lab.twitter as Record<string, unknown>).images).toBeUndefined();
  });
});
