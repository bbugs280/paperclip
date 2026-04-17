import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "bitly",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Bitly",
  description: "Bitly plugin. Create short links and get click analytics for shortened URLs.",
  author: "@bbugs280",
  categories: ["connector"],
  capabilities: [
    "agent.tools.register",
    "http.outbound",
    "secrets.read-ref",
    "instance.settings.register"
  ],
  entrypoints: {
    worker: "./dist/worker.js"
  },
  tools: [
    {
      name: "bitly-shorten",
      displayName: "Shorten URL",
      description: "Create a Bitly short link for a long URL. Returns the short link.",
      parametersSchema: {
        type: "object",
        properties: {
          longUrl: {
            type: "string",
            description: "The long URL to shorten"
          },
          title: {
            type: "string",
            description: "Optional title/label for the link"
          }
        },
        required: ["longUrl"]
      }
    },
    {
      name: "bitly-get-link-clicks",
      displayName: "Get Link Clicks",
      description: "Get total click count for a Bitly short link over a time period",
      parametersSchema: {
        type: "object",
        properties: {
          bitlink: {
            type: "string",
            description: "The Bitly short link, e.g. bit.ly/abc123"
          },
          units: {
            type: "number",
            description: "Number of time units to look back (default: 7)"
          },
          unit: {
            type: "string",
            enum: ["minute", "hour", "day", "week", "month"],
            description: "Time unit granularity (default: day)"
          }
        },
        required: ["bitlink"]
      }
    },
    {
      name: "bitly-get-link-summary",
      displayName: "Get Link Summary",
      description: "Get full stats summary for a Bitly link: clicks by day, referrers, and top countries",
      parametersSchema: {
        type: "object",
        properties: {
          bitlink: {
            type: "string",
            description: "The Bitly short link, e.g. bit.ly/abc123"
          },
          units: {
            type: "number",
            description: "Number of days to look back (default: 7)"
          }
        },
        required: ["bitlink"]
      }
    }
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      accessTokenRef: {
        type: "string",
        title: "Access Token Reference",
        description: "Secret reference for Bitly API access token",
        default: "bitly_access_token",
        format: "secret-ref"
      }
    }
  }
};

export default manifest;
