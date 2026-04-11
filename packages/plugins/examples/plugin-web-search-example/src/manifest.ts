import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "paperclip.web-search-example";
const PLUGIN_VERSION = "0.1.0";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Web Search (Example)",
  description: "Reference plugin that provides web search and web crawling capabilities to Paperclip agents. Includes web-search (find articles) and web-crawl (read full content) tools.",
  author: "Paperclip",
  categories: ["automation"],
  capabilities: [
    "agent.tools.register",
    "http.outbound",
    "secrets.read-ref",
    "instance.settings.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  tools: [
    {
      name: "web-search",
      displayName: "Web Search",
      description: "Search the web using Tavily or Google Custom Search API. Returns relevant results with titles, URLs, and snippets.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          maxResults: { type: "number" },
        },
        required: ["query"],
      },
    },
    {
      name: "web-crawl",
      displayName: "Web Crawl",
      description: "Fetch and extract readable text content from a web page URL.",
      parametersSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
        },
        required: ["url"],
      },
    },
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        title: "Search Provider",
        description: "Which search API to use",
        enum: ["tavily", "google"],
        default: "tavily",
      },
      tavilyApiKeyRef: {
        type: "string",
        title: "Tavily API Key Reference",
        description: "Secret reference for Tavily API key (e.g., tavily_api_key)",
        default: "tavily_api_key",
      },
      googleApiKeyRef: {
        type: "string",
        title: "Google API Key Reference",
        description: "Secret reference for Google Custom Search API key",
        default: "google_search_api_key",
      },
      googleEngineIdRef: {
        type: "string",
        title: "Google Search Engine ID Reference",
        description: "Secret reference for Google Custom Search Engine ID",
        default: "google_search_engine_id",
      },
      maxResults: {
        type: "number",
        title: "Max Results Per Search",
        description: "Maximum number of search results to return",
        default: 5,
        minimum: 1,
        maximum: 20,
      },
    },
  },
};

export default manifest;
