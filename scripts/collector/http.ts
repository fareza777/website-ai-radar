const UA = "Mozilla/5.0 (compatible; AIRadarBot/1.0; +https://github.com/fareza777/website-ai-radar)";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  /** Some vendor pages block bot user agents; use a browser UA for page verification only. */
  browserUa?: boolean;
}

export class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
  }
}

function githubHeaders(url: string): Record<string, string> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token || !url.startsWith("https://api.github.com/")) return {};
  return { authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const { timeoutMs = 25_000, retries = 2, headers = {}, browserUa = false } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": browserUa ? BROWSER_UA : UA, "accept-language": "en-US,en;q=0.9", ...githubHeaders(url), ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      });
      if (!res.ok) {
        // 4xx (except 429) will not succeed on retry.
        if (res.status < 500 && res.status !== 429) throw new HttpError(res.status, url);
        lastError = new HttpError(res.status, url);
      } else {
        return await res.text();
      }
    } catch (err) {
      if (err instanceof HttpError && err.status < 500 && err.status !== 429) throw err;
      lastError = err;
    }
    if (attempt < retries) await sleep(1500 * (attempt + 1));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const text = await fetchText(url, { ...opts, headers: { accept: "application/json", ...opts.headers } });
  return JSON.parse(text) as T;
}

/** Runs async tasks with bounded concurrency, preserving input order. */
export async function pool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 300);
  return String(err).slice(0, 300);
}

export { sleep };
