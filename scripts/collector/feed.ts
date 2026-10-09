import { XMLParser } from "fast-xml-parser";
import { parseDate, stripHtml } from "./text";

export interface FeedEntry {
  title: string;
  url: string;
  publishedAt: Date | null;
  updatedAt: Date | null;
  html: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  cdataPropName: "#cdata",
  processEntities: false,
  htmlEntities: false,
  trimValues: true,
});

type Node = unknown;

function asArray(v: Node): Node[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Extracts text content from a parsed XML node (string, {#text}, {#cdata}, or arrays thereof). */
function text(v: Node): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(text).join(" ");
  if (typeof v === "object") {
    const o = v as Record<string, Node>;
    if (o["#cdata"] != null) return text(o["#cdata"]);
    if (o["#text"] != null) return text(o["#text"]);
  }
  return "";
}

function atomLink(v: Node): string {
  const links = asArray(v) as Record<string, string>[];
  const alt = links.find((l) => typeof l === "object" && (l["@rel"] == null || l["@rel"] === "alternate"));
  const pick = alt ?? links[0];
  if (!pick) return "";
  return typeof pick === "string" ? pick : pick["@href"] ?? text(pick);
}

/** Parses RSS 2.0, Atom 1.0 and RSS 1.0 (RDF). Invalid XML throws. */
export function parseFeed(xml: string): FeedEntry[] {
  const doc = parser.parse(xml) as Record<string, Record<string, Node>>;
  if (doc.rss) {
    const channel = doc.rss.channel as Record<string, Node>;
    return asArray(channel?.item).map((raw) => {
      const it = raw as Record<string, Node>;
      return {
        title: stripHtml(text(it.title)),
        url: text(it.link) || text(it.guid),
        publishedAt: parseDate(text(it.pubDate) || text(it["dc:date"])),
        updatedAt: parseDate(text(it["atom:updated"])),
        html: text(it["content:encoded"]) || text(it.description),
      };
    });
  }
  if (doc.feed) {
    return asArray(doc.feed.entry).map((raw) => {
      const it = raw as Record<string, Node>;
      return {
        title: stripHtml(text(it.title)),
        url: atomLink(it.link),
        publishedAt: parseDate(text(it.published) || text(it.updated)),
        updatedAt: parseDate(text(it.updated)),
        html: text(it.content) || text(it.summary),
      };
    });
  }
  const rdf = doc["rdf:RDF"];
  if (rdf) {
    return asArray(rdf.item).map((raw) => {
      const it = raw as Record<string, Node>;
      return {
        title: stripHtml(text(it.title)),
        url: text(it.link),
        publishedAt: parseDate(text(it["dc:date"])),
        updatedAt: null,
        html: text(it.description),
      };
    });
  }
  throw new Error("Unrecognized feed format (not RSS/Atom/RDF)");
}
