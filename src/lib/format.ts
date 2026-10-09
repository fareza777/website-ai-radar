const SERVER_TZ = "Asia/Jakarta";

const dateFmt = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: SERVER_TZ });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: SERVER_TZ, timeZoneName: "short",
});
const dayHeaderFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: SERVER_TZ });
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: SERVER_TZ });

/** Deterministic (timezone-pinned) formatting — safe for server render and hydration. */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function formatDayHeader(iso: string): string {
  return dayHeaderFmt.format(new Date(iso));
}

/** YYYY-MM-DD in WIB, used to group timelines by day. */
export function dayKey(iso: string): string {
  return dayKeyFmt.format(new Date(iso));
}

const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** Relative time. `now` must come from the client (never call during server prerender). */
export function relativeTime(iso: string, now: number): string {
  const diff = (Date.parse(iso) - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.round(diff / 86_400), "day");
  if (abs < 86_400 * 365) return rtf.format(Math.round(diff / (86_400 * 30)), "month");
  return rtf.format(Math.round(diff / (86_400 * 365)), "year");
}

/** USD per 1M tokens, compact. */
export function usd(n: number): string {
  if (n === 0) return "Free";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
