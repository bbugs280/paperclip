import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PaperclipBot/1.0; +https://paperclip.ai)",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
};

function extractTagContent(xml: string, tag: string): string | undefined {
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

function normalizePublicationUrl(raw: string): string {
  // Accept "newworldvalue.substack.com" or "https://newworldvalue.substack.com"
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.tools.register(
      "substack-get-posts",
      {
        displayName: "Get Recent Posts",
        description: "Fetch recent posts from a Substack publication via RSS. Returns title, date, URL, and preview.",
        parametersSchema: {
          type: "object",
          properties: {
            publicationUrl: { type: "string", description: "The Substack publication URL, e.g. newworldvalue.substack.com" },
            limit: { type: "number", description: "Max number of posts to return (default: 10)" },
          },
          required: ["publicationUrl"],
        },
      },
      async (params) => {
        const p = params as { publicationUrl: string; limit?: number };
        const domain = normalizePublicationUrl(p.publicationUrl);
        const limit = p.limit ?? 10;
        const feedUrl = `https://${domain}/feed`;

        try {
          const resp = await ctx.http.fetch(feedUrl, { method: "GET", headers: FETCH_HEADERS });
          if (!resp.ok) return { error: `Failed to fetch Substack feed: ${resp.status}` };
          const xml = await resp.text();

          const items: Array<{ title: string; link: string; pubDate: string; summary: string }> = [];
          const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
          let m: RegExpExecArray | null;
          while ((m = itemRe.exec(xml)) !== null && items.length < limit) {
            const chunk = m[1];
            const title = stripHtml(extractTagContent(chunk, "title") ?? "");
            const link = extractTagContent(chunk, "link") ?? "";
            const pubDate = extractTagContent(chunk, "pubDate") ?? "";
            const raw = extractTagContent(chunk, "description") ?? extractTagContent(chunk, "content:encoded") ?? "";
            const summary = stripHtml(raw).slice(0, 300);
            if (title || link) items.push({ title, link: link.trim(), pubDate, summary });
          }

          if (!items.length) return { content: `No posts found at ${domain}`, data: [] };

          const content = items
            .map((p, i) => `${i + 1}. **${p.title}**\n   ${p.pubDate}\n   ${p.link}\n   ${p.summary}`)
            .join("\n\n");

          return { content, data: items };
        } catch (err) {
          return { error: `Substack feed fetch failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    );

    ctx.tools.register(
      "substack-get-post-stats",
      {
        displayName: "Get Post Stats",
        description: "Fetch like count and comment count for a specific Substack post using the public reader API.",
        parametersSchema: {
          type: "object",
          properties: {
            postUrl: { type: "string", description: "Full URL of the Substack post, e.g. https://newworldvalue.substack.com/p/some-post" },
          },
          required: ["postUrl"],
        },
      },
      async (params) => {
        const p = params as { postUrl: string };
        // Guard: return a clean error instead of crashing if postUrl is missing/undefined
        if (!p.postUrl) return { error: "Missing required parameter: postUrl" };
        // Extract subdomain and slug from URL
        // e.g. https://newworldvalue.substack.com/p/some-post
        const match = p.postUrl.match(/https?:\/\/([^/]+)\/p\/([^/?#]+)/);
        if (!match) return { error: "Invalid Substack post URL. Expected format: https://publication.substack.com/p/slug" };
        const [, domain, slug] = match;
        // Substack public reader API
        const apiUrl = `https://${domain}/api/v1/posts/${encodeURIComponent(slug)}`;
        try {
          const resp = await ctx.http.fetch(apiUrl, {
            method: "GET",
            headers: { ...FETCH_HEADERS, Accept: "application/json" },
          });
          if (!resp.ok) return { error: `Substack API error: ${resp.status}. Post may be subscriber-only or not found.` };
          const data = await resp.json() as {
            title?: string;
            like_count?: number;
            comment_count?: number;
            postDate?: string;
            canonical_url?: string;
          };
          const content = [
            `**${data.title ?? slug}**`,
            `URL: ${data.canonical_url ?? p.postUrl}`,
            `Published: ${data.postDate ?? "unknown"}`,
            `Likes: ${data.like_count ?? "N/A"}`,
            `Comments: ${data.comment_count ?? "N/A"}`,
          ].join("\n");
          return { content, data };
        } catch (err) {
          return { error: `Substack stats fetch failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    );
  },

  async onHealth() {
    return { status: "ok", message: "Substack plugin worker is running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
