import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "x-api";
const PLUGIN_VERSION = "0.1.0";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "X API",
  description: "Comprehensive X.com (Twitter) API plugin for Paperclip agents. Supports tweets, likes, retweets, follows, search, user info, and timelines.",
  author: "@paperclipai",
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
      name: "x-search",
      displayName: "X Search",
      description: "Search recent tweets on X.com",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (e.g., 'AI agents')" },
          maxResults: { type: "number", description: "Max tweets to return (1-100)" },
        },
        required: ["query"],
      },
    },
    {
      name: "x-get-user",
      displayName: "Get User",
      description: "Get user info by username",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string", description: "X username (without @)" },
        },
        required: ["username"],
      },
    },
    {
      name: "x-get-timeline",
      displayName: "Get Timeline",
      description: "Get recent tweets from a user",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string", description: "X username (without @)" },
          maxResults: { type: "number", description: "Max tweets to return (1-100)" },
        },
        required: ["username"],
      },
    },
    {
      name: "x-post-tweet",
      displayName: "Post Tweet",
      description: "Post a new tweet (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Tweet text (max 280 chars)" },
          replyToId: { type: "string", description: "Optional tweet ID to reply to" },
        },
        required: ["text"],
      },
    },
    {
      name: "x-like",
      displayName: "Like Tweet",
      description: "Like a tweet (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string", description: "Tweet ID to like" },
        },
        required: ["tweetId"],
      },
    },
    {
      name: "x-unlike",
      displayName: "Unlike Tweet",
      description: "Unlike a previously liked tweet (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string", description: "Tweet ID to unlike" },
        },
        required: ["tweetId"],
      },
    },
    {
      name: "x-retweet",
      displayName: "Retweet",
      description: "Retweet a tweet (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string", description: "Tweet ID to retweet" },
        },
        required: ["tweetId"],
      },
    },
    {
      name: "x-unretweet",
      displayName: "Unretweet",
      description: "Remove a retweet (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string", description: "Tweet ID to unretweet" },
        },
        required: ["tweetId"],
      },
    },
    {
      name: "x-follow",
      displayName: "Follow User",
      description: "Follow a user (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string", description: "Username to follow (without @)" },
        },
        required: ["username"],
      },
    },
    {
      name: "x-unfollow",
      displayName: "Unfollow User",
      description: "Unfollow a user (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string", description: "Username to unfollow (without @)" },
        },
        required: ["username"],
      },
    },
    {
      name: "x-delete-tweet",
      displayName: "Delete Tweet",
      description: "Delete a tweet you posted (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string", description: "Tweet ID to delete" },
        },
        required: ["tweetId"],
      },
    },
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      bearerTokenRef: {
        type: "string",
        title: "Bearer Token Reference",
        description: "Secret reference for X API bearer token (read-only ops: search, timeline, user lookup)",
        default: "x_bearer_token",
      },
      consumerKeyRef: {
        type: "string",
        title: "Consumer Key Reference",
        description: "Secret reference for X API consumer key / Client ID (OAuth 1.0a write ops)",
        default: "x_consumer_key",
      },
      consumerSecretRef: {
        type: "string",
        title: "Consumer Secret Reference",
        description: "Secret reference for X API consumer secret / Client Secret (OAuth 1.0a write ops)",
        default: "x_consumer_secret",
      },
      accessTokenRef: {
        type: "string",
        title: "Access Token Reference",
        description: "Secret reference for X API access token (OAuth 1.0a write ops)",
        default: "x_access_token",
      },
      accessTokenSecretRef: {
        type: "string",
        title: "Access Token Secret Reference",
        description: "Secret reference for X API access token secret (OAuth 1.0a write ops)",
        default: "x_access_token_secret",
      },
    },
  },
};

export default manifest;
