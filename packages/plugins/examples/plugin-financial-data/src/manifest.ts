import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "financial-data",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Financial Data",
  description:
    "Real-time stock quotes, currency exchange rates, company info, and symbol search. Powered by Yahoo Finance (no key) and exchangerate.host (no key). Optional Alpha Vantage integration for enhanced fundamentals.",
  author: "bbugs280",
  categories: ["connector"],
  capabilities: [
    "agent.tools.register",
    "http.outbound",
    "secrets.read-ref",
    "instance.settings.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui/",
  },
  tools: [
    {
      name: "stock-quote",
      displayName: "Stock Quote",
      description:
        "Get real-time or latest trading price, volume, 52-week range, and market cap for a stock or ETF ticker symbol.",
      parametersSchema: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Ticker symbol (e.g. AAPL, 0700.HK)" },
        },
        required: ["symbol"],
      },
    },
    {
      name: "stock-info",
      displayName: "Stock Info",
      description:
        "Get company summary data including sector, industry, trailing PE, forward PE, EPS, dividend yield, and analyst targets.",
      parametersSchema: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Ticker symbol (e.g. AAPL, 0700.HK)" },
        },
        required: ["symbol"],
      },
    },
    {
      name: "search-symbol",
      displayName: "Search Symbol",
      description:
        "Search for stock ticker symbols by company name or keyword. Returns a list of matching symbols with exchange and type.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Company name or keyword" },
        },
        required: ["query"],
      },
    },
    {
      name: "currency-rate",
      displayName: "Currency Rate",
      description:
        "Get the current exchange rate from a base currency (e.g. USD) to one or more target currencies (e.g. HKD, EUR, GBP).",
      parametersSchema: {
        type: "object",
        properties: {
          base: { type: "string", description: "Base currency code (e.g. USD, HKD)" },
          targets: { type: "array", items: { type: "string" } },
        },
        required: ["base"],
      },
    },
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      alphavantageApiKeyRef: {
        type: "string",
        description:
          "Optional secret reference for an Alpha Vantage API key (e.g. env:ALPHAVANTAGE_API_KEY). Required only for enhanced fundamental data. Get a free key at alphavantage.co.",
      },
    },
  },
};

export default manifest;
