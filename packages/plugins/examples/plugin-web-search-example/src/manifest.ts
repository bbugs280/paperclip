import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "web-search";
const PLUGIN_VERSION = "0.1.0";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Web Search",
  description: "Web search and article extraction plugin for Paperclip agents. Includes web-search (find articles) and web-crawl (extract readable text) tools. Supports Tavily and Google Custom Search APIs.",
  author: "@bbugs280",
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
    {
      name: "x-search",
      displayName: "X Search",
      description: "Search X.com (Twitter) recent tweets or fetch tweets from a username. Uses configured X API bearer token.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for recent tweets" },
          username: { type: "string", description: "Optional username to fetch tweets from instead of a free-text query" },
          maxResults: { type: "number", description: "Maximum number of tweets to return" },
        },
        required: [],
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
      xApiKeyRef: {
        type: "string",
        title: "X API Bearer Token Reference",
        description: "Secret reference for the X.com (Twitter) API bearer token",
        default: "x_api_bearer_token",
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
