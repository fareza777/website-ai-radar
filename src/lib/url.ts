/** True only for absolute http(s) URLs — blocks javascript:, data:, etc. */
export function isHttpUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Same-origin app path ("/labs/x"), excluding protocol-relative "//host". */
export function isInternalPath(href: string): boolean {
  return /^\/(?!\/)/.test(href);
}

/** href safe to render for external links; falls back to "#" for anything unexpected. */
export function extHref(href: string): string {
  return isHttpUrl(href) ? href : "#";
}
