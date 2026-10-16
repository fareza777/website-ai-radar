import type { Metadata } from "next";
import { SITE } from "./site";

interface PageMetaInput {
  title: string;
  description: string;
  /** Canonical path, e.g. "/labs/openai". */
  path: string;
  /** Atom feed advertised for this page (feed autodiscovery). */
  feed?: string;
  /** Share image path. Defaults to the site card; pass null when the page has its own colocated opengraph-image. */
  image?: string | null;
  noindex?: boolean;
}

const DEFAULT_IMAGE = "/opengraph-image";

/**
 * Complete per-page metadata. A page-level `openGraph`/`twitter` replaces the layout's wholesale, so every page must
 * carry its own title/description/url — otherwise shares of /labs/openai would show the generic homepage card.
 */
export function pageMetadata({ title, description, path, feed, image = DEFAULT_IMAGE, noindex }: PageMetaInput): Metadata {
  const shareTitle = `${title} · ${SITE.name}`;
  // Replacing `openGraph` also drops the layout's file-based share image, so it is re-attached explicitly.
  const images = image ? [{ url: image, width: 1200, height: 630, alt: `${SITE.name} — ${SITE.tagline}` }] : undefined;
  return {
    title,
    description,
    // A page-level `alternates` replaces the layout's, so the feed links (autodiscovery) are repeated here on every page.
    alternates: { canonical: path, types: { "application/atom+xml": feed ?? "/feed.xml", "application/feed+json": "/feed.json" } },
    openGraph: { type: "website", siteName: SITE.name, title: shareTitle, description, url: path, locale: "en_US", ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title: shareTitle, description, ...(images ? { images: images.map((i) => i.url) } : {}) },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

type Json = Record<string, unknown>;

/** JSON for an inline <script type="application/ld+json">: "<" is escaped so data can never close the tag. */
export function jsonLdString(data: Json): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** WebSite (with sitelinks search box) + Organization for the home page. */
export function websiteJsonLd(base: string): Json {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: SITE.name,
        alternateName: `${SITE.name} — ${SITE.tagline}`,
        description: SITE.description,
        inLanguage: "en",
        publisher: { "@id": `${base}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${base}/firehose?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: SITE.name,
        url: base,
        logo: { "@type": "ImageObject", url: `${base}/icon`, width: 512, height: 512 },
        sameAs: [SITE.repo],
      },
    ],
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/** BreadcrumbList; the first crumb is always the home page. */
export function breadcrumbJsonLd(base: string, crumbs: readonly Crumb[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: SITE.name, path: "/" }, ...crumbs].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.path === "/" ? base : `${base}${c.path}`,
    })),
  };
}

/** A standalone breadcrumb document for simple top-level pages. */
export function breadcrumbDocument(base: string, crumbs: readonly Crumb[]): Json {
  return { "@context": "https://schema.org", ...breadcrumbJsonLd(base, crumbs) };
}
