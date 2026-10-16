import { LAB_BY_SLUG } from "@/config/labs";
import type { UpdateItem } from "./types";

/** Atom + JSON Feed builders (no dependencies). All values come from validated collector data. */

export interface FeedMeta {
  title: string;
  subtitle: string;
  /** Absolute URL of this feed. */
  self: string;
  /** Absolute URL of the human page. */
  home: string;
  updated: string;
}

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

function body(i: UpdateItem): string {
  return `${i.summary}\n\nWhy it matters: ${i.benefit}`;
}

export function atomFeed(meta: FeedMeta, items: readonly UpdateItem[]): string {
  const entries = items
    .map((i) => {
      const lab = LAB_BY_SLUG[i.lab]?.name ?? i.lab;
      return `  <entry>
    <id>${xml(i.url)}</id>
    <title>${xml(`${lab}: ${i.title}`)}</title>
    <link rel="alternate" href="${xml(i.url)}"/>
    <published>${i.publishedAt}</published>
    <updated>${i.updatedAt}</updated>
    <author><name>${xml(lab)}</name></author>
    <category term="${xml(i.category)}"/>
    <summary type="text">${xml(body(i))}</summary>
  </entry>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${xml(meta.self)}</id>
  <title>${xml(meta.title)}</title>
  <subtitle>${xml(meta.subtitle)}</subtitle>
  <link rel="self" href="${xml(meta.self)}"/>
  <link rel="alternate" href="${xml(meta.home)}"/>
  <updated>${meta.updated}</updated>
${entries}
</feed>
`;
}

export function jsonFeed(meta: FeedMeta, items: readonly UpdateItem[]): string {
  return JSON.stringify(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: meta.title,
      description: meta.subtitle,
      home_page_url: meta.home,
      feed_url: meta.self,
      language: "en",
      items: items.map((i) => ({
        id: i.url,
        url: i.url,
        title: `${LAB_BY_SLUG[i.lab]?.name ?? i.lab}: ${i.title}`,
        content_text: body(i),
        date_published: i.publishedAt,
        date_modified: i.updatedAt,
        authors: [{ name: LAB_BY_SLUG[i.lab]?.name ?? i.lab }],
        tags: [i.category, ...i.tags],
      })),
    },
    null,
    2,
  );
}
