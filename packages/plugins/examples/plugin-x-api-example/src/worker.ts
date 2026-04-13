import {
  definePlugin,
  runWorker,
  type PluginContext,
  type ToolResult,
} from "@paperclipai/plugin-sdk";
import { createHmac } from "node:crypto";

const PLUGIN_NAME = "x-api";

interface XApiConfig {
  bearerTokenRef: string;
  consumerKeyRef: string;
  consumerSecretRef: string;
  accessTokenRef: string;
  accessTokenSecretRef: string;
}

interface XApiCreds {
  consumerKey: string | null;
  consumerSecret: string | null;
  accessToken: string | null;
  accessTokenSecret: string | null;
  bearerToken?: string | null;
}

const DEFAULT_CONFIG: XApiConfig = {
  bearerTokenRef: "x_bearer_token",
  consumerKeyRef: "x_consumer_key",
  consumerSecretRef: "x_consumer_secret",
  accessTokenRef: "x_access_token",
  accessTokenSecretRef: "x_access_token_secret",
};

async function getConfig(ctx: PluginContext): Promise<XApiConfig> {
  const config = await ctx.config.get();
  return {
    ...DEFAULT_CONFIG,
    ...(config as Partial<XApiConfig>),
  };
}

/**
 * Build an OAuth 1.0a Authorization header with HMAC-SHA1 signing.
 * Suitable for X API v2 endpoints using OAuth 1.0a user context.
 * For JSON-body requests the body is NOT included in the signature
 * (only URL-encoded form bodies are signed per the spec).
 */
function buildOAuth1Header(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  extraParams: Record<string, string> = {},
): string {
  const pct = (s: string | number) =>
    encodeURIComponent(String(s)).replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );

  const nonce =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
    ...extraParams,
  };

  // Parse URL to separate base URL from query params
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  const allParams: Record<string, string> = { ...oauthParams };
  for (const [k, v] of urlObj.searchParams.entries()) {
    allParams[k] = v;
  }

  // Sort and encode parameter string
  const paramStr = Object.keys(allParams)
    .sort()
    .map((k) => `${pct(k)}=${pct(allParams[k])}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${pct(baseUrl)}&${pct(paramStr)}`;
  const signingKey = `${pct(consumerSecret)}&${pct(accessTokenSecret)}`;
  const signature = createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauthParams.oauth_signature = signature;

  const headerValue =
    "OAuth " +
    Object.keys(oauthParams)
      .filter((k) => k.startsWith("oauth_"))
      .sort()
      .map((k) => `${pct(k)}="${pct(oauthParams[k])}"`)
      .join(", ");

  return headerValue;
}

/**
 * Build an auth header for read (GET) operations given resolved credentials.
 * Prefers OAuth 1.0a when all 4 creds present; falls back to Bearer token.
 * Must be called AFTER URL query params are fully set so they're in the signature.
 */
function makeReadAuthHeader(
  method: string,
  url: string,
  creds: XApiCreds,
): string | null {
  if (
    creds.consumerKey &&
    creds.consumerSecret &&
    creds.accessToken &&
    creds.accessTokenSecret
  ) {
    return buildOAuth1Header(
      method,
      url,
      creds.consumerKey,
      creds.consumerSecret,
      creds.accessToken,
      creds.accessTokenSecret,
    );
  }
  if (creds.bearerToken) return `Bearer ${creds.bearerToken}`;
  return null;
}

/**
 * Search recent tweets on X
 */
async function searchTweets(
  ctx: PluginContext,
  query: string,
  maxResults: number,
  creds: XApiCreds,
): Promise<ToolResult> {
  try {
    const url = new URL("https://api.twitter.com/2/tweets/search/recent");
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", String(Math.min(maxResults, 100)));
    url.searchParams.set("tweet.fields", "created_at,author_id,public_metrics");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "username,name");

    // Build auth header AFTER all query params are set so they're included in OAuth signature
    let authHeader: string;
    if (
      creds.consumerKey &&
      creds.consumerSecret &&
      creds.accessToken &&
      creds.accessTokenSecret
    ) {
      authHeader = buildOAuth1Header(
        "GET",
        url.toString(),
        creds.consumerKey,
        creds.consumerSecret,
        creds.accessToken,
        creds.accessTokenSecret,
      );
    } else if (creds.bearerToken) {
      authHeader = `Bearer ${creds.bearerToken}`;
    } else {
      return { error: "No auth configured" };
    }

    const resp = await ctx.http.fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: authHeader },
    });

    if (!resp.ok) {
      return { error: `X API error: ${resp.status}` };
    }

    const data = await resp.json();
    const tweets = (data && data.data) || [];
    const users = (data && data.includes && data.includes.users) || [];

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const content = (tweets as any[])
      .slice(0, maxResults)
      .map((t, i) => {
        const author = (userMap.get(t.author_id) || {}) as any;
        return `${i + 1}. @${author.username} (${author.name})\n"${t.text}"\nhttps://x.com/i/web/status/${t.id}\n`;
      })
      .join("\n");

    return {
      content: content || `No tweets found for: "${query}"`,
      data: { query, resultCount: tweets.length, tweets },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `X search failed: ${message}` };
  }
}

/**
 * Get user info by username
 */
async function getUser(
  ctx: PluginContext,
  username: string,
  creds: XApiCreds,
): Promise<ToolResult> {
  try {
    const url = new URL(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`);
    url.searchParams.set("user.fields", "created_at,description,location,public_metrics,verified");

    // Build auth header AFTER all query params are set
    let authHeader: string;
    if (
      creds.consumerKey &&
      creds.consumerSecret &&
      creds.accessToken &&
      creds.accessTokenSecret
    ) {
      authHeader = buildOAuth1Header(
        "GET",
        url.toString(),
        creds.consumerKey,
        creds.consumerSecret,
        creds.accessToken,
        creds.accessTokenSecret,
      );
    } else if (creds.bearerToken) {
      authHeader = `Bearer ${creds.bearerToken}`;
    } else {
      return { error: "No auth configured" };
    }

    const resp = await ctx.http.fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: authHeader },
    });

    if (!resp.ok) {
      return { error: `User not found or API error: ${resp.status}` };
    }

    const data = await resp.json();
    const user = data.data;

    if (!user) {
      return { error: `User ${username} not found` };
    }

    const content = `
@${user.username} (${user.name})
${user.verified ? "✓ Verified" : ""}
Created: ${user.created_at}
Location: ${user.location || "N/A"}
Bio: ${user.description || "N/A"}

Followers: ${user.public_metrics?.followers_count || 0}
Following: ${user.public_metrics?.following_count || 0}
Tweets: ${user.public_metrics?.tweet_count || 0}
Likes: ${user.public_metrics?.like_count || 0}

Profile: https://x.com/${user.username}
    `.trim();

    return {
      content,
      data: { user },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to get user: ${message}` };
  }
}

/**
 * Get user timeline (recent tweets from a user)
 */
async function getUserTimeline(
  ctx: PluginContext,
  username: string,
  maxResults: number,
  creds: XApiCreds,
): Promise<ToolResult> {
  try {
    // First get user ID
    const userUrl = new URL(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`);
    const userAuthHeader = makeReadAuthHeader("GET", userUrl.toString(), creds);
    if (!userAuthHeader) return { error: "No auth configured" };

    const userResp = await ctx.http.fetch(userUrl.toString(), {
      method: "GET",
      headers: { Authorization: userAuthHeader },
    });

    if (!userResp.ok) {
      return { error: `User ${username} not found` };
    }

    const userData = await userResp.json();
    const userId = userData.data?.id;

    if (!userId) {
      return { error: `Could not resolve user ${username}` };
    }

    // Get timeline — build new auth header with timeline URL (userId changes the URL)
    const timelineUrl = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
    timelineUrl.searchParams.set("max_results", String(Math.min(maxResults, 100)));
    timelineUrl.searchParams.set("tweet.fields", "created_at,public_metrics");

    const timelineAuthHeader = makeReadAuthHeader("GET", timelineUrl.toString(), creds);
    if (!timelineAuthHeader) return { error: "No auth configured" };

    const timelineResp = await ctx.http.fetch(timelineUrl.toString(), {
      method: "GET",
      headers: { Authorization: timelineAuthHeader },
    });

    if (!timelineResp.ok) {
      return { error: `Failed to get timeline: ${timelineResp.status}` };
    }

    const timelineData = await timelineResp.json();
    const tweets = (timelineData && timelineData.data) || [];

    const content = (tweets as any[])
      .slice(0, maxResults)
      .map((t, i) => `${i + 1}. ${t.text}\nhttps://x.com/i/web/status/${t.id}\n`)
      .join("\n");

    return {
      content: content || `No tweets found for @${username}`,
      data: { username, resultCount: tweets.length, tweets },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to get timeline: ${message}` };
  }
}

/**
 * Post a new tweet using OAuth 1.0a
 */
async function postTweet(
  ctx: PluginContext,
  text: string,
  replyToId: string | null,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<ToolResult> {
  if (!text || text.trim().length === 0) {
    return { error: "Tweet text cannot be empty" };
  }

  if (text.length > 280) {
    return { error: `Tweet exceeds 280 characters (${text.length})` };
  }

  try {
    const body: any = { text };
    if (replyToId) {
      body.reply = { in_reply_to_tweet_id: replyToId };
    }

    const url = "https://api.twitter.com/2/tweets";
    const authHeader = buildOAuth1Header(
      "POST",
      url,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    );

    const resp = await ctx.http.fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const error = await resp.text();
      return { error: `Failed to post tweet: ${resp.status} - ${error}` };
    }

    const data = await resp.json();
    const tweetId = data.data?.id;

    return {
      content: `Tweet posted successfully!\nhttps://x.com/i/web/status/${tweetId}`,
      data: { tweetId, text },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to post tweet: ${message}` };
  }
}

/**
 * Like a tweet using OAuth 1.0a
 */
async function likeTweet(
  ctx: PluginContext,
  tweetId: string,
  userId: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<ToolResult> {
  try {
    const url = `https://api.twitter.com/2/users/${userId}/likes`;
    const authHeader = buildOAuth1Header(
      "POST",
      url,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    );
    const resp = await ctx.http.fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tweet_id: tweetId }),
    });

    if (!resp.ok) {
      const error = await resp.text();
      return { error: `Failed to like tweet: ${resp.status} - ${error}` };
    }

    return {
      content: `Tweet liked successfully!`,
      data: { tweetId },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to like tweet: ${message}` };
  }
}

/**
 * Unlike a tweet using OAuth 1.0a
 */
async function unlikeTweet(
  ctx: PluginContext,
  tweetId: string,
  userId: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<ToolResult> {
  try {
    const url = `https://api.twitter.com/2/users/${userId}/likes/${tweetId}`;
    const authHeader = buildOAuth1Header(
      "DELETE",
      url,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    );
    const resp = await ctx.http.fetch(url, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    if (!resp.ok) {
      const error = await resp.text();
      return { error: `Failed to unlike tweet: ${resp.status} - ${error}` };
    }

    return {
      content: `Tweet unliked successfully!`,
      data: { tweetId },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to unlike tweet: ${message}` };
  }
}

/**
 * Retweet a tweet using OAuth 1.0a
 */
async function reTweet(
  ctx: PluginContext,
  tweetId: string,
  userId: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<ToolResult> {
  try {
    const url = `https://api.twitter.com/2/users/${userId}/retweets`;
    const authHeader = buildOAuth1Header(
      "POST",
      url,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    );
    const resp = await ctx.http.fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tweet_id: tweetId }),
    });

    if (!resp.ok) {
      const error = await resp.text();
      return { error: `Failed to retweet: ${resp.status} - ${error}` };
    }

    return {
      content: `Tweeted retweeted successfully!`,
      data: { tweetId },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to retweet: ${message}` };
  }
}

/**
 * Unretweet a tweet using OAuth 1.0a
 */
async function unReTweet(
  ctx: PluginContext,
  tweetId: string,
  userId: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<ToolResult> {
  try {
    const url = `https://api.twitter.com/2/users/${userId}/retweets/${tweetId}`;
    const authHeader = buildOAuth1Header(
      "DELETE",
      url,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    );
    const resp = await ctx.http.fetch(url, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    if (!resp.ok) {
      const error = await resp.text();
      return { error: `Failed to unretweet: ${resp.status} - ${error}` };
    }

    return {
      content: `Retweet removed successfully!`,
      data: { tweetId },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to unretweet: ${message}` };
  }
}

/**
 * Follow a user using OAuth 1.0a
 */
async function followUser(
  ctx: PluginContext,
  targetUsername: string,
  userId: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  bearerToken: string | null,
): Promise<ToolResult> {
  try {
    // Lookup target user ID (read — use bearer token if available)
    const userUrl = new URL(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(targetUsername)}`,
    );
    const readAuth = bearerToken
      ? `Bearer ${bearerToken}`
      : buildOAuth1Header(
          "GET",
          userUrl.toString(),
          consumerKey,
          consumerSecret,
          accessToken,
          accessTokenSecret,
        );
    const userResp = await ctx.http.fetch(userUrl.toString(), {
      method: "GET",
      headers: { Authorization: readAuth },
    });

    if (!userResp.ok) {
      return { error: `User ${targetUsername} not found` };
    }

    const userData = await userResp.json();
    const targetUserId = userData.data?.id;

    if (!targetUserId) {
      return { error: `Could not resolve user ${targetUsername}` };
    }

    const followUrl = `https://api.twitter.com/2/users/${userId}/following`;
    const authHeader = buildOAuth1Header(
      "POST",
      followUrl,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    );
    const followResp = await ctx.http.fetch(followUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target_user_id: targetUserId }),
    });

    if (!followResp.ok) {
      const error = await followResp.text();
      return { error: `Failed to follow ${targetUsername}: ${followResp.status} - ${error}` };
    }

    return {
      content: `Successfully followed @${targetUsername}!`,
      data: { targetUsername, targetUserId },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to follow user: ${message}` };
  }
}

/**
 * Unfollow a user using OAuth 1.0a
 */
async function unfollowUser(
  ctx: PluginContext,
  targetUsername: string,
  userId: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  bearerToken: string | null,
): Promise<ToolResult> {
  try {
    const userUrl = new URL(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(targetUsername)}`,
    );
    const readAuth = bearerToken
      ? `Bearer ${bearerToken}`
      : buildOAuth1Header(
          "GET",
          userUrl.toString(),
          consumerKey,
          consumerSecret,
          accessToken,
          accessTokenSecret,
        );
    const userResp = await ctx.http.fetch(userUrl.toString(), {
      method: "GET",
      headers: { Authorization: readAuth },
    });

    if (!userResp.ok) {
      return { error: `User ${targetUsername} not found` };
    }

    const userData = await userResp.json();
    const targetUserId = userData.data?.id;

    if (!targetUserId) {
      return { error: `Could not resolve user ${targetUsername}` };
    }

    const unfollowUrl = `https://api.twitter.com/2/users/${userId}/following/${targetUserId}`;
    const authHeader = buildOAuth1Header(
      "DELETE",
      unfollowUrl,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    );
    const unfollowResp = await ctx.http.fetch(unfollowUrl, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    if (!unfollowResp.ok) {
      const error = await unfollowResp.text();
      return {
        error: `Failed to unfollow ${targetUsername}: ${unfollowResp.status} - ${error}`,
      };
    }

    return {
      content: `Successfully unfollowed @${targetUsername}!`,
      data: { targetUsername, targetUserId },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to unfollow user: ${message}` };
  }
}

/**
 * Delete a tweet using OAuth 1.0a
 */
async function deleteTweet(
  ctx: PluginContext,
  tweetId: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<ToolResult> {
  try {
    const url = `https://api.twitter.com/2/tweets/${tweetId}`;
    const authHeader = buildOAuth1Header(
      "DELETE",
      url,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    );
    const resp = await ctx.http.fetch(url, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    if (!resp.ok) {
      const error = await resp.text();
      return { error: `Failed to delete tweet: ${resp.status} - ${error}` };
    }

    return {
      content: `Tweet deleted successfully!`,
      data: { tweetId },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to delete tweet: ${message}` };
  }
}

async function registerToolHandlers(ctx: PluginContext): Promise<void> {
  // Secrets are resolved lazily inside each handler so the plugin
  // can install and start without requiring secrets to be pre-configured.

  /**
   * Resolve a secret: try the secrets store first (ref is a named secret key).
   * If that fails AND the ref looks like an actual credential value (long string
   * with non-word chars, or URL-encoded), use it directly. Short alphanumeric
   * names (like "x_bearer_token") are treated as secret references only.
   */
  async function resolveSecret(ref: string | undefined): Promise<string | null> {
    if (!ref) return null;
    try {
      const val = await ctx.secrets.resolve(ref);
      if (val) return val;
    } catch (_) { /* fall through */ }
    // If the ref itself looks like a credential value (contains special chars
    // common in tokens: -, +, /, =, %, uppercase hex), use it as the value.
    if (ref.length > 20 || /[+/=%\-]/.test(ref)) {
      // URL-decode in case the user pasted a URL-encoded token
      try { return decodeURIComponent(ref); } catch (_) { return ref; }
    }
    return null;
  }

  async function getBearerToken(): Promise<string | null> {
    const config = await getConfig(ctx);
    return await resolveSecret(config.bearerTokenRef);
  }

  async function getOAuth1Creds(): Promise<{ consumerKey: string | null; consumerSecret: string | null; accessToken: string | null; accessTokenSecret: string | null }> {
    const config = await getConfig(ctx);
    const [consumerKey, consumerSecret, accessToken, accessTokenSecret] = await Promise.all([
      resolveSecret(config.consumerKeyRef),
      resolveSecret(config.consumerSecretRef),
      resolveSecret(config.accessTokenRef),
      resolveSecret(config.accessTokenSecretRef),
    ]);
    return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
  }

  async function getReadCreds(): Promise<XApiCreds> {
    const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = await getOAuth1Creds();
    const bearerToken = await getBearerToken();
    return { consumerKey, consumerSecret, accessToken, accessTokenSecret, bearerToken };
  }

  // x-search
  ctx.tools.register(
    "x-search",
    {
      displayName: "X Search",
      description: "Search recent tweets on X.com",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          maxResults: { type: "number" },
        },
        required: ["query"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const creds = await getReadCreds();
      const p = params as Record<string, unknown>;
      const query = p.query as string;
      const maxResults = Math.max(1, Math.min(((p.maxResults as number) ?? 10), 100));
      return await searchTweets(ctx, query, maxResults, creds);
    },
  );

  // x-get-user
  ctx.tools.register(
    "x-get-user",
    {
      displayName: "Get User",
      description: "Get user info by username",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string" },
        },
        required: ["username"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const creds = await getReadCreds();
      const p = params as Record<string, unknown>;
      return await getUser(ctx, p.username as string, creds);
    },
  );

  // x-get-timeline
  ctx.tools.register(
    "x-get-timeline",
    {
      displayName: "Get Timeline",
      description: "Get recent tweets from a user",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string" },
          maxResults: { type: "number" },
        },
        required: ["username"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const creds = await getReadCreds();
      const p = params as Record<string, unknown>;
      const username = p.username as string;
      const maxResults = Math.max(1, Math.min(((p.maxResults as number) ?? 10), 100));
      return await getUserTimeline(ctx, username, maxResults, creds);
    },
  );

  // x-post-tweet
  ctx.tools.register(
    "x-post-tweet",
    {
      displayName: "Post Tweet",
      description: "Post a new tweet using OAuth 1.0a (requires x_consumer_key, x_consumer_secret, x_access_token, x_access_token_secret)",
      parametersSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
          replyToId: { type: "string" },
        },
        required: ["text"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = await getOAuth1Creds();
      if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
        return { error: "OAuth 1.0a credentials not fully configured. Set secrets: x_consumer_key, x_consumer_secret, x_access_token, x_access_token_secret" };
      }
      const p = params as Record<string, unknown>;
      const text = p.text as string;
      const replyToId = (p.replyToId as string) ?? null;
      return await postTweet(ctx, text, replyToId, consumerKey, consumerSecret, accessToken, accessTokenSecret);
    },
  );

  // x-like
  ctx.tools.register(
    "x-like",
    {
      displayName: "Like Tweet",
      description: "Like a tweet using OAuth 1.0a (requires userId and OAuth 1.0a credentials)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
          userId: { type: "string", description: "Your X user ID (numeric)" },
        },
        required: ["tweetId", "userId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = await getOAuth1Creds();
      if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
        return { error: "OAuth 1.0a credentials not configured" };
      }
      const p = params as Record<string, unknown>;
      return await likeTweet(ctx, p.tweetId as string, p.userId as string, consumerKey, consumerSecret, accessToken, accessTokenSecret);
    },
  );

  // x-unlike
  ctx.tools.register(
    "x-unlike",
    {
      displayName: "Unlike Tweet",
      description: "Unlike a tweet using OAuth 1.0a",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
          userId: { type: "string", description: "Your X user ID (numeric)" },
        },
        required: ["tweetId", "userId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = await getOAuth1Creds();
      if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
        return { error: "OAuth 1.0a credentials not configured" };
      }
      const p = params as Record<string, unknown>;
      return await unlikeTweet(ctx, p.tweetId as string, p.userId as string, consumerKey, consumerSecret, accessToken, accessTokenSecret);
    },
  );

  // x-retweet
  ctx.tools.register(
    "x-retweet",
    {
      displayName: "Retweet",
      description: "Retweet a tweet using OAuth 1.0a",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
          userId: { type: "string", description: "Your X user ID (numeric)" },
        },
        required: ["tweetId", "userId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = await getOAuth1Creds();
      if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
        return { error: "OAuth 1.0a credentials not configured" };
      }
      const p = params as Record<string, unknown>;
      return await reTweet(ctx, p.tweetId as string, p.userId as string, consumerKey, consumerSecret, accessToken, accessTokenSecret);
    },
  );

  // x-unretweet
  ctx.tools.register(
    "x-unretweet",
    {
      displayName: "Unretweet",
      description: "Remove a retweet using OAuth 1.0a",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
          userId: { type: "string", description: "Your X user ID (numeric)" },
        },
        required: ["tweetId", "userId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = await getOAuth1Creds();
      if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
        return { error: "OAuth 1.0a credentials not configured" };
      }
      const p = params as Record<string, unknown>;
      return await unReTweet(ctx, p.tweetId as string, p.userId as string, consumerKey, consumerSecret, accessToken, accessTokenSecret);
    },
  );

  // x-follow
  ctx.tools.register(
    "x-follow",
    {
      displayName: "Follow User",
      description: "Follow a user using OAuth 1.0a",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string" },
          userId: { type: "string", description: "Your X user ID (numeric)" },
        },
        required: ["username", "userId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = await getOAuth1Creds();
      if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
        return { error: "OAuth 1.0a credentials not configured" };
      }
      const bearerToken = await getBearerToken();
      const p = params as Record<string, unknown>;
      return await followUser(ctx, p.username as string, p.userId as string, consumerKey, consumerSecret, accessToken, accessTokenSecret, bearerToken);
    },
  );

  // x-unfollow
  ctx.tools.register(
    "x-unfollow",
    {
      displayName: "Unfollow User",
      description: "Unfollow a user using OAuth 1.0a",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string" },
          userId: { type: "string", description: "Your X user ID (numeric)" },
        },
        required: ["username", "userId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = await getOAuth1Creds();
      if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
        return { error: "OAuth 1.0a credentials not configured" };
      }
      const bearerToken = await getBearerToken();
      const p = params as Record<string, unknown>;
      return await unfollowUser(ctx, p.username as string, p.userId as string, consumerKey, consumerSecret, accessToken, accessTokenSecret, bearerToken);
    },
  );

  // x-delete-tweet
  ctx.tools.register(
    "x-delete-tweet",
    {
      displayName: "Delete Tweet",
      description: "Delete a tweet you posted using OAuth 1.0a",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
        },
        required: ["tweetId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = await getOAuth1Creds();
      if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
        return { error: "OAuth 1.0a credentials not configured" };
      }
      const p = params as Record<string, unknown>;
      return await deleteTweet(ctx, p.tweetId as string, consumerKey, consumerSecret, accessToken, accessTokenSecret);
    },
  );
}

const plugin = definePlugin({
  async setup(ctx) {
    await registerToolHandlers(ctx);
    ctx.logger.info(`${PLUGIN_NAME} plugin setup complete`);
  },

  async onHealth() {
    return { status: "ok", message: "X API plugin ready" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
