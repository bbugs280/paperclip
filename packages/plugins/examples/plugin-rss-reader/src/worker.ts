import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { PluginContext, ToolResult } from "@paperclipai/plugin-sdk";

// ---------------------------------------------------------------------------
// Finance news feed bundle (public, no auth required)
// ---------------------------------------------------------------------------

const FINANCE_FEEDS: Array<{ name: string; url: string }> = [
  {
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
  },
  {
    name: "CNBC Top News",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
  },
  {
    name: "FT Markets",
    url: "https://www.ft.com/rss/home/uk",
  },
  {
    name: "Bloomberg Markets",
    url: "https://feeds.bloomberg.com/markets/news.rss",
  },
  {
    name: "SCMP Business",
    url: "https://www.scmp.com/rss/91/feed/",
  },
  {
    name: "Seeking Alpha",
    url: "https://seekingalpha.com/feed.xml",
  },
  {
    name: "Nikkei Asia",
    url: "https://asia.nikkei.com/rss/feed/nar",
  },
];

const FETCH_HEADERS = {
  "User-Agent": "FundStarter/1.0 (RSS reader; research@fundstarter.com)",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
};

// ---------------------------------------------------------------------------
// Lightweight RSS/Atom XML parser (no external dependencies)
// ---------------------------------------------------------------------------

interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  summary?: string;
  source?: string;
}

function extractTagContent(xml: string, tag: string): string | undefined {
  // Try <tag>content</tag> and <tag ...>content</tag>
  const re = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? stripCdata(m[1].trim()) : undefined;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseRssItems(xml: string, sourceName?: string): FeedItem[] {
  const items: FeedItem[] = [];

  // Support both RSS <item> and Atom <entry>
  const itemPattern = /<(item|entry)[\s>]([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemPattern.exec(xml)) !== null) {
    const chunk = m[2];

    const title = extractTagContent(chunk, "title") ?? "";
    // Link: RSS uses <link>, Atom uses <link href="..."/> or <link>
    let link =
      extractTagContent(chunk, "link") ??
      chunk.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ??
      "";
    // Remove whitespace-only links
    link = link.trim();

    // Date: pubDate (RSS), published (Atom), updated (Atom), dc:date
    const pubDate =
      extractTagContent(chunk, "pubDate") ??
      extractTagContent(chunk, "published") ??
      extractTagContent(chunk, "updated") ??
      extractTagContent(chunk, "dc:date");

    // Summary: description (RSS), summary (Atom), content (Atom)
    const rawSummary =
      extractTagContent(chunk, "description") ??
      extractTagContent(chunk, "summary") ??
      extractTagContent(chunk, "content");

    const summary = rawSummary ? stripHtml(rawSummary).slice(0, 400) : undefined;

    if (title || link) {
      items.push({
        title: stripHtml(title),
        link,
        pubDate,
        summary,
        source: sourceName,
      });
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Fetch a single feed
// ---------------------------------------------------------------------------

async function fetchFeedUrl(
  ctx: PluginContext,
  url: string,
  sourceName?: string,
  maxItems = 20
): Promise<{ items: FeedItem[]; error?: string }> {
  let resp: Awaited<ReturnType<PluginContext["http"]["fetch"]>>;
  try {
    resp = await ctx.http.fetch(url, { method: "GET", headers: FETCH_HEADERS, redirect: "follow" });
  } catch (err) {
    return { items: [], error: `Network error: ${String(err)}` };
  }

  if (!resp.ok) {
    return { items: [], error: `HTTP ${resp.status} from ${url}` };
  }

  let xml: string;
  try {
    xml = await resp.text();
  } catch (err) {
    return { items: [], error: `Failed to read response: ${String(err)}` };
  }

  const items = parseRssItems(xml, sourceName).slice(0, maxItems);
  return { items };
}

// ---------------------------------------------------------------------------
// Format items as Markdown
// ---------------------------------------------------------------------------

function formatItems(items: FeedItem[], sourceLabel?: string): string {
  if (items.length === 0) return "_No items found._";
  const lines: string[] = [];
  if (sourceLabel) lines.push(`### ${sourceLabel}`, "");

  for (const item of items) {
    const dateStr = item.pubDate
      ? parseDate(item.pubDate)?.toUTCString() ?? item.pubDate
      : null;
    lines.push(`**${item.title || "(no title)"}**`);
    if (item.link) lines.push(`[${item.link}](${item.link})`);
    if (dateStr) lines.push(`*${dateStr}*`);
    if (item.summary) lines.push(item.summary);
    lines.push("");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function fetchFeed(
  ctx: PluginContext,
  params: { url: string; max_items?: number }
): Promise<ToolResult> {
  const { url, max_items } = params;
  if (!url?.trim()) {
    return { content: "Error: url is required." };
  }
  const maxItems = max_items && max_items > 0 ? Math.min(max_items, 50) : 20;
  const { items, error } = await fetchFeedUrl(ctx, url.trim(), undefined, maxItems);
  if (error && items.length === 0) {
    return { content: `Failed to fetch feed: ${error}` };
  }
  const text = formatItems(items);
  return { content: `## RSS Feed: ${url}\n\n${text}` };
}

async function fetchFinanceFeeds(
  ctx: PluginContext,
  params: { max_items_per_feed?: number; sources?: string[] }
): Promise<ToolResult> {
  const maxPerFeed =
    params.max_items_per_feed && params.max_items_per_feed > 0
      ? Math.min(params.max_items_per_feed, 20)
      : 5;

  const feedList =
    params.sources && params.sources.length > 0
      ? FINANCE_FEEDS.filter((f) =>
          params.sources!.some(
            (s) =>
              f.name.toLowerCase().includes(s.toLowerCase()) ||
              f.url.toLowerCase().includes(s.toLowerCase())
          )
        )
      : FINANCE_FEEDS;

  if (feedList.length === 0) {
    return { content: "No matching feeds found. Available feeds: " + FINANCE_FEEDS.map((f) => f.name).join(", ") };
  }

  // Fetch all feeds in parallel
  const results = await Promise.all(
    feedList.map((f) => fetchFeedUrl(ctx, f.url, f.name, maxPerFeed))
  );

  // Merge and sort all items by date, newest first
  const allItems: FeedItem[] = [];
  for (const r of results) {
    allItems.push(...r.items);
  }

  allItems.sort((a, b) => {
    const da = parseDate(a.pubDate);
    const db = parseDate(b.pubDate);
    if (da && db) return db.getTime() - da.getTime();
    if (da) return -1;
    if (db) return 1;
    return 0;
  });

  const errors = results
    .map((r, i) => (r.error ? `${feedList[i].name}: ${r.error}` : null))
    .filter(Boolean) as string[];

  const lines: string[] = [
    `## Finance News (${allItems.length} items from ${feedList.length} feeds)`,
    "",
  ];

  if (errors.length > 0) {
    lines.push(`_Errors: ${errors.join("; ")}_`, "");
  }

  lines.push(formatItems(allItems));

  return { content: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

async function registerToolHandlers(ctx: PluginContext): Promise<void> {
  await ctx.tools.register(
    "fetch-feed",
    {
      displayName: "Fetch RSS Feed",
      description:
        "Fetch a single RSS or Atom feed URL. Returns recent items with title, link, date, and summary.",
      parametersSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Full URL of the RSS or Atom feed to fetch",
          },
          max_items: {
            type: "number",
            description: "Maximum number of items to return (default 20, max 50)",
          },
        },
        required: ["url"],
      },
    },
    async (params: unknown, _runCtx) => {
      return fetchFeed(ctx, params as { url: string; max_items?: number });
    }
  );

  await ctx.tools.register(
    "fetch-finance-feeds",
    {
      displayName: "Fetch Finance News Feeds",
      description:
        "Fetch a curated bundle of financial/market news RSS feeds (MarketWatch, Bloomberg, CNBC, FT, SCMP, Seeking Alpha, Nikkei Asia) in parallel. Returns items merged and sorted newest-first.",
      parametersSchema: {
        type: "object",
        properties: {
          max_items_per_feed: {
            type: "number",
            description:
              "Maximum items to include per feed source (default 5, max 20)",
          },
          sources: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional filter: names or URL fragments of specific sources to include. Omit to include all feeds.",
          },
        },
      },
    },
    async (params: unknown, _runCtx) => {
      return fetchFinanceFeeds(ctx, params as { max_items_per_feed?: number; sources?: string[] });
    }
  );
}

const plugin = definePlugin({ setup: registerToolHandlers });
runWorker(plugin, import.meta.url);
