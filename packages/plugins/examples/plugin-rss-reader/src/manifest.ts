import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "rss-reader",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "RSS Reader",
  description:
    "Fetch and parse RSS/Atom feeds. Includes a curated bundle of financial news sources (Reuters, Bloomberg, CNBC, FT, SCMP) for market monitoring.",
  author: "bbugs280",
  categories: ["connector"],
  capabilities: ["agent.tools.register", "http.outbound"],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui/",
  },
  tools: [
    {
      name: "fetch-feed",
      displayName: "Fetch RSS Feed",
      description:
        "Fetch a single RSS or Atom feed URL and return recent items with title, link, published date, and summary.",
      parametersSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL of the RSS or Atom feed" },
          max_items: { type: "number" },
        },
        required: ["url"],
      },
    },
    {
      name: "fetch-finance-feeds",
      displayName: "Fetch Finance News Feeds",
      description:
        "Fetch a curated bundle of financial/market news RSS feeds in parallel and return the latest combined items, sorted newest-first.",
      parametersSchema: {
        type: "object",
        properties: {
          max_items_per_feed: { type: "number" },
          sources: { type: "array", items: { type: "string" } },
        },
      },
    },
  ],
};

export default manifest;
