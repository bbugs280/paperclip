import {
  definePlugin,
  runWorker,
  type PluginContext,
  type ToolResult,
} from "@paperclipai/plugin-sdk";

const PLUGIN_NAME = "x-api";

interface XApiConfig {
  bearerTokenRef: string;
  accessTokenRef: string;
  accessTokenSecretRef: string;
}

const DEFAULT_CONFIG: XApiConfig = {
  bearerTokenRef: "x_bearer_token",
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
 * Search recent tweets on X
 */
async function searchTweets(
  ctx: PluginContext,
  query: string,
  maxResults: number,
  bearerToken: string,
): Promise<ToolResult> {
  try {
    const url = new URL("https://api.twitter.com/2/tweets/search/recent");
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", String(Math.min(maxResults, 100)));
    url.searchParams.set("tweet.fields", "created_at,author_id,public_metrics");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "username,name");

    const resp = await ctx.http.fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
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
  bearerToken: string,
): Promise<ToolResult> {
  try {
    const url = new URL(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`);
    url.searchParams.set("user.fields", "created_at,description,location,public_metrics,verified");

    const resp = await ctx.http.fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
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
  bearerToken: string,
): Promise<ToolResult> {
  try {
    // First get user ID
    const userUrl = new URL(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`);
    const userResp = await ctx.http.fetch(userUrl.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    if (!userResp.ok) {
      return { error: `User ${username} not found` };
    }

    const userData = await userResp.json();
    const userId = userData.data?.id;

    if (!userId) {
      return { error: `Could not resolve user ${username}` };
    }

    // Get timeline
    const timelineUrl = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
    timelineUrl.searchParams.set("max_results", String(Math.min(maxResults, 100)));
    timelineUrl.searchParams.set("tweet.fields", "created_at,public_metrics");

    const timelineResp = await ctx.http.fetch(timelineUrl.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
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
 * Post a new tweet (requires user access token)
 */
async function postTweet(
  ctx: PluginContext,
  text: string,
  replyToId: string | null,
  accessToken: string,
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

    const resp = await ctx.http.fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
 * Like a tweet (requires user access token)
 */
async function likeTweet(
  ctx: PluginContext,
  tweetId: string,
  userId: string,
  accessToken: string,
): Promise<ToolResult> {
  try {
    const resp = await ctx.http.fetch(`https://api.twitter.com/2/users/${userId}/likes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
 * Unlike a tweet (requires user access token)
 */
async function unlikeTweet(
  ctx: PluginContext,
  tweetId: string,
  userId: string,
  accessToken: string,
): Promise<ToolResult> {
  try {
    const resp = await ctx.http.fetch(
      `https://api.twitter.com/2/users/${userId}/likes/${tweetId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

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
 * Retweet a tweet (requires user access token)
 */
async function reTweet(
  ctx: PluginContext,
  tweetId: string,
  userId: string,
  accessToken: string,
): Promise<ToolResult> {
  try {
    const resp = await ctx.http.fetch(`https://api.twitter.com/2/users/${userId}/retweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
 * Unretweet a tweet (requires user access token)
 */
async function unReTweet(
  ctx: PluginContext,
  tweetId: string,
  userId: string,
  accessToken: string,
): Promise<ToolResult> {
  try {
    const resp = await ctx.http.fetch(
      `https://api.twitter.com/2/users/${userId}/retweets/${tweetId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

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
 * Follow a user (requires user access token)
 */
async function followUser(
  ctx: PluginContext,
  targetUsername: string,
  userId: string,
  accessToken: string,
  bearerToken: string,
): Promise<ToolResult> {
  try {
    // Get target user ID
    const userUrl = new URL(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(targetUsername)}`,
    );
    const userResp = await ctx.http.fetch(userUrl.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    if (!userResp.ok) {
      return { error: `User ${targetUsername} not found` };
    }

    const userData = await userResp.json();
    const targetUserId = userData.data?.id;

    if (!targetUserId) {
      return { error: `Could not resolve user ${targetUsername}` };
    }

    // Follow the user
    const followResp = await ctx.http.fetch(
      `https://api.twitter.com/2/users/${userId}/following`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
      },
    );

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
 * Unfollow a user (requires user access token)
 */
async function unfollowUser(
  ctx: PluginContext,
  targetUsername: string,
  userId: string,
  accessToken: string,
  bearerToken: string,
): Promise<ToolResult> {
  try {
    // Get target user ID
    const userUrl = new URL(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(targetUsername)}`,
    );
    const userResp = await ctx.http.fetch(userUrl.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    if (!userResp.ok) {
      return { error: `User ${targetUsername} not found` };
    }

    const userData = await userResp.json();
    const targetUserId = userData.data?.id;

    if (!targetUserId) {
      return { error: `Could not resolve user ${targetUsername}` };
    }

    // Unfollow the user
    const unfollowResp = await ctx.http.fetch(
      `https://api.twitter.com/2/users/${userId}/following/${targetUserId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

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
 * Delete a tweet (requires user access token)
 */
async function deleteTweet(
  ctx: PluginContext,
  tweetId: string,
  accessToken: string,
): Promise<ToolResult> {
  try {
    const resp = await ctx.http.fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
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

  async function getBearerToken(): Promise<string | null> {
    const config = await getConfig(ctx);
    return await ctx.secrets.resolve(config.bearerTokenRef).catch(() => null);
  }

  async function getAccessToken(): Promise<string | null> {
    const config = await getConfig(ctx);
    return await ctx.secrets.resolve(config.accessTokenRef).catch(() => null);
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
      const bearerToken = await getBearerToken();
      if (!bearerToken) {
        return { error: "Bearer token not configured (set x_bearer_token secret)" };
      }
      const p = params as Record<string, unknown>;
      const query = p.query as string;
      const maxResults = Math.max(1, Math.min(((p.maxResults as number) ?? 10), 100));
      return await searchTweets(ctx, query, maxResults, bearerToken);
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
      const bearerToken = await getBearerToken();
      if (!bearerToken) {
        return { error: "Bearer token not configured (set x_bearer_token secret)" };
      }
      const p = params as Record<string, unknown>;
      return await getUser(ctx, p.username as string, bearerToken);
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
      const bearerToken = await getBearerToken();
      if (!bearerToken) {
        return { error: "Bearer token not configured (set x_bearer_token secret)" };
      }
      const p = params as Record<string, unknown>;
      const username = p.username as string;
      const maxResults = Math.max(1, Math.min(((p.maxResults as number) ?? 10), 100));
      return await getUserTimeline(ctx, username, maxResults, bearerToken);
    },
  );

  // x-post-tweet
  ctx.tools.register(
    "x-post-tweet",
    {
      displayName: "Post Tweet",
      description: "Post a new tweet (requires authentication)",
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
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return { error: "Access token not configured (set x_access_token secret)" };
      }
      const p = params as Record<string, unknown>;
      const text = p.text as string;
      const replyToId = (p.replyToId as string) ?? null;
      return await postTweet(ctx, text, replyToId, accessToken);
    },
  );

  // x-like
  ctx.tools.register(
    "x-like",
    {
      displayName: "Like Tweet",
      description: "Like a tweet (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
        },
        required: ["tweetId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return { error: "Access token not configured (set x_access_token secret)" };
      }
      const p = params as Record<string, unknown>;
      return { error: "User ID resolution needed (implement via token introspection)" };
    },
  );

  // x-unlike
  ctx.tools.register(
    "x-unlike",
    {
      displayName: "Unlike Tweet",
      description: "Unlike a tweet (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
        },
        required: ["tweetId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return { error: "Access token not configured (set x_access_token secret)" };
      }
      return { error: "User ID resolution needed (implement via token introspection)" };
    },
  );

  // x-retweet
  ctx.tools.register(
    "x-retweet",
    {
      displayName: "Retweet",
      description: "Retweet a tweet (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
        },
        required: ["tweetId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return { error: "Access token not configured (set x_access_token secret)" };
      }
      return { error: "User ID resolution needed (implement via token introspection)" };
    },
  );

  // x-unretweet
  ctx.tools.register(
    "x-unretweet",
    {
      displayName: "Unretweet",
      description: "Remove a retweet (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
        },
        required: ["tweetId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return { error: "Access token not configured (set x_access_token secret)" };
      }
      return { error: "User ID resolution needed (implement via token introspection)" };
    },
  );

  // x-follow
  ctx.tools.register(
    "x-follow",
    {
      displayName: "Follow User",
      description: "Follow a user (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string" },
        },
        required: ["username"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const accessToken = await getAccessToken();
      const bearerToken = await getBearerToken();
      if (!accessToken || !bearerToken) {
        return { error: "Tokens not configured for write operations" };
      }
      return { error: "User ID resolution needed (implement via token introspection)" };
    },
  );

  // x-unfollow
  ctx.tools.register(
    "x-unfollow",
    {
      displayName: "Unfollow User",
      description: "Unfollow a user (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          username: { type: "string" },
        },
        required: ["username"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const accessToken = await getAccessToken();
      const bearerToken = await getBearerToken();
      if (!accessToken || !bearerToken) {
        return { error: "Tokens not configured for write operations" };
      }
      return { error: "User ID resolution needed (implement via token introspection)" };
    },
  );

  // x-delete-tweet
  ctx.tools.register(
    "x-delete-tweet",
    {
      displayName: "Delete Tweet",
      description: "Delete a tweet you posted (requires authentication)",
      parametersSchema: {
        type: "object",
        properties: {
          tweetId: { type: "string" },
        },
        required: ["tweetId"],
      },
    },
    async (params: unknown): Promise<ToolResult> => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return { error: "Access token not configured (set x_access_token secret)" };
      }
      const p = params as Record<string, unknown>;
      return await deleteTweet(ctx, p.tweetId as string, accessToken);
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
