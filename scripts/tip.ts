/**
 * Add a tip without GitHub Issues (handy from Cursor / terminal):
 *   npm run tip -- --x https://x.com/user/status/123 --url https://product.com --note "why" [--by cursor]
 * At least one of --x or --url is required. Picked up by the next `npm run collect`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = join(process.cwd(), "src", "config", "tips.json");
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const isHttp = (v?: string) => !!v && /^https?:\/\/\S+$/.test(v);

const x = arg("x");
const url = arg("url");
const note = arg("note");
const by = arg("by");
if (!isHttp(x) && !isHttp(url)) {
  console.error("Usage: npm run tip -- --x <X or Threads post url> --url <product url> [--note <text>] [--by cursor]");
  process.exit(1);
}
const X_OR_THREADS = /^https:\/\/((www\.|mobile\.)?(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+|(www\.)?threads\.(net|com)\/@[A-Za-z0-9._]+\/post\/[A-Za-z0-9_-]+)/;
if (x && !X_OR_THREADS.test(x)) {
  console.error("--x must be an X post URL (https://x.com/user/status/123) or a Threads post URL (https://www.threads.com/@user/post/CODE)");
  process.exit(1);
}
const tips = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>[];
if (tips.some((t) => (x && t.x === x) || (url && t.url === url))) {
  console.log("Tip already exists.");
  process.exit(0);
}
tips.unshift({ ...(x ? { x } : {}), ...(url ? { url } : {}), ...(note ? { note } : {}), ...(by ? { by } : {}), addedAt: new Date().toISOString() });
writeFileSync(file, `${JSON.stringify(tips, null, 2)}\n`);
console.log(`Added tip (${tips.length} total). Run: npm run collect -- --only=discover`);
