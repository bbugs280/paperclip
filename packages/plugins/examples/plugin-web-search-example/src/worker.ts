import {
  definePlugin,
  runWorker,
  type PluginContext,
  type ToolResult,
} from "@paperclipai/plugin-sdk";

const PLUGIN_NAME = "web-search-example";
const TOOL_NAME_SEARCH = "web-search";
const TOOL_NAME_CRAWL = "web-crawl";
const TOOL_NAME_X = "x-search";

interface WebSearchConfig {
  provider: "tavily" | "google";
  tavilyApiKeyRef: string;
  xApiKeyRef: string;
  googleApiKeyRef: string;
  googleEngineIdRef: string;
  maxResults: number;
}

const DEFAULT_CONFIG: WebSearchConfig = {
  provider: "tavily",
  tavilyApiKeyRef: "tavily_api_key",
  xApiKeyRef: "x_api_bearer_token",
  googleApiKeyRef: "google_search_api_key",
  googleEngineIdRef: "google_search_engine_id",
  maxResults: 5,
};

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  results: TavilySearchResult[];
}

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
}

async function getConfig(ctx: PluginContext): Promise<WebSearchConfig> {
  const config = await ctx.config.get();
  return {
    ...DEFAULT_CONFIG,
    ...(config as Partial<WebSearchConfig>),
  };
}

async function searchWithTavily(
  ctx: PluginContext,
  query: string,
  apiKeyRef: string,
  maxResults: number,
): Promise<ToolResult> {
  const apiKey = await ctx.secrets.resolve(apiKeyRef);
  if (!apiKey) {
    return { error: "Tavily API key not configured" };
  }

  try {
    const response = await ctx.http.fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      return { error: `Tavily API error: ${response.status}` };
    }

    const data = (await response.json()) as TavilyResponse;
    const results = data.results || [];

    const content = results
      .map(
        (result, idx) =>
          `${idx + 1}. **${result.title}**\nURL: ${result.url}\n${result.content}`,
      )
      .join("\n\n");

    return {
      content:
        content ||
        `No results found for query: "${query}"`,
      data: {
        provider: "tavily",
        query,
        resultCount: results.length,
        results,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Tavily search failed: ${message}` };
  }
}

async function searchWithGoogle(
  ctx: PluginContext,
  query: string,
  apiKeyRef: string,
  engineIdRef: string,
  maxResults: number,
): Promise<ToolResult> {
  const apiKey = await ctx.secrets.resolve(apiKeyRef);
  const engineId = await ctx.secrets.resolve(engineIdRef);

  if (!apiKey || !engineId) {
    return { error: "Google Search API credentials not configured" };
  }

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("q", query);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", engineId);
    url.searchParams.set("num", String(Math.min(maxResults, 10)));

    const response = await ctx.http.fetch(url.toString(), {
      method: "GET",
    });

    if (!response.ok) {
      return { error: `Google Custom Search API error: ${response.status}` };
    }

    const data = (await response.json()) as GoogleSearchResponse;
    const results = data.items || [];

    const content = results
      .map(
        (result, idx) =>
          `${idx + 1}. **${result.title}**\nURL: ${result.link}\n${result.snippet}`,
      )
      .join("\n\n");

    return {
      content:
        content ||
        `No results found for query: "${query}"`,
      data: {
        provider: "google",
        query,
        resultCount: results.length,
        results,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Google Search failed: ${message}` };
  }
}

function extractReadableText(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Decode HTML entities minimally
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
  };
  Object.entries(entities).forEach(([entity, char]) => {
    text = text.split(entity).join(char);
  });

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Limit to first 8000 characters
  return text.slice(0, 8000);
}

async function crawlUrl(ctx: PluginContext, url: string): Promise<ToolResult> {
  // Basic URL validation
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { error: "URL must start with http:// or https://" };
  }

  try {
    const response = await ctx.http.fetch(url, { method: "GET" });

    if (!response.ok) {
      return { error: `Failed to fetch: HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return { error: `Content is not HTML (${contentType})` };
    }

    const html = await response.text();
    const readableText = extractReadableText(html);

    if (readableText.length === 0) {
      return { error: "No readable content extracted from page" };
    }

    return {
      content: readableText,
      data: {
        url,
        characterCount: readableText.length,
        wasTruncated: html.length > 8000,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Failed to crawl URL: ${message}` };
  }
}
async function registerToolHandlers(ctx: PluginContext): Promise<void> {
  // Register web-search tool
  ctx.tools.register(
    TOOL_NAME_SEARCH,
    {
      displayName: "Web Search",
      description:
        "Search the web using Tavily or Google Custom Search API. Returns relevant results with titles, URLs, and content snippets.",
      parametersSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to execute",
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return (1-20, uses config default if not specified)",
          },
        },
        required: ["query"],
      },
    },
    async (params: unknown, _runCtx): Promise<ToolResult> => {
      const payload = params as Record<string, unknown>;
      const query = payload.query as string;
      if (!query || query.trim().length === 0) {
        return { error: "Query cannot be empty" };
      }

      const config = await getConfig(ctx);
      const maxResults = (payload.maxResults as number | undefined) ?? config.maxResults;

      if (config.provider === "tavily") {
        return await searchWithTavily(ctx, query, config.tavilyApiKeyRef, maxResults);
      } else if (config.provider === "google") {
        return await searchWithGoogle(
          ctx,
          query,
          config.googleApiKeyRef,
          config.googleEngineIdRef,
          maxResults,
        );
      }

      return { error: `Unknown search provider: ${config.provider}` };
    },
  );

  // Register web-crawl tool
  ctx.tools.register(
    TOOL_NAME_CRAWL,
    {
      displayName: "Web Crawl",
      description:
        "Fetch and extract readable text content from a web page URL. Removes HTML, scripts, and styles to return clean article text.",
      parametersSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL to crawl (must start with http:// or https://)",
          },
        },
        required: ["url"],
      },
    },
    async (params: unknown, _runCtx): Promise<ToolResult> => {
      const payload = params as Record<string, unknown>;
      const url = payload.url as string;
      if (!url || url.trim().length === 0) {
        return { error: "URL cannot be empty" };
      }

      return await crawlUrl(ctx, url);
    },
  );

  // Register x-search tool (X.com / Twitter)
  ctx.tools.register(
    TOOL_NAME_X,
    {
      displayName: "X Search",
      description:
        "Search X.com (Twitter) recent tweets or fetch tweets from a username. Uses configured X API bearer token.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for recent tweets" },
          username: { type: "string", description: "Optional username to fetch tweets from instead of a free-text query" },
          maxResults: { type: "number", description: "Maximum number of tweets to return (1-100)" },
        },
      },
    },
    async (params: unknown, _runCtx): Promise<ToolResult> => {
      const payload = params as Record<string, unknown>;
      const query = (payload.query as string | undefined) ?? "";
      const username = (payload.username as string | undefined) ?? null;
      const requestedMax = (payload.maxResults as number | undefined) ?? undefined;

      const config = await getConfig(ctx);
      const maxResults = Math.max(1, Math.min(requestedMax ?? config.maxResults, 100));
      const apiKeyRef = config.xApiKeyRef ?? "x_api_bearer_token";

      const token = await ctx.secrets.resolve(apiKeyRef);
      if (!token) {
        return { error: "X API bearer token not configured (resolve secret ref)" };
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      try {
        // If username provided, fetch user id then their tweets
        if (username) {
          const userResp = await ctx.http.fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=profile_image_url,username`, {
            method: "GET",
            headers,
          });

          if (!userResp.ok) {
            return { error: `Failed to resolve username ${username}: HTTP ${userResp.status}` };
          }

          const userData = await userResp.json();
          const userId = (userData && userData.data && userData.data.id) || null;
          if (!userId) {
            return { error: `Username not found: ${username}` };
          }

          const tweetsUrl = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
          tweetsUrl.searchParams.set("max_results", String(Math.min(maxResults, 100)));
          tweetsUrl.searchParams.set("tweet.fields", "created_at,author_id,public_metrics");

          const tweetsResp = await ctx.http.fetch(tweetsUrl.toString(), { method: "GET", headers });
          if (!tweetsResp.ok) {
            return { error: `Failed to fetch tweets for ${username}: HTTP ${tweetsResp.status}` };
          }

          const tweetsData = await tweetsResp.json();
          const tweets = (tweetsData && tweetsData.data) || [];

          const content = (tweets as any[])
            .map((t, i) => `${i + 1}. ${t.text}\nhttps://x.com/i/web/status/${t.id}\n${t.created_at ?? ""}`)
            .join("\n\n");

          return {
            content: content || `No tweets found for user ${username}`,
            data: { mode: "username", username, resultCount: tweets.length, tweets },
          };
        }

        // Otherwise perform a recent search query
        if (!query || query.trim().length === 0) {
          return { error: "Either `query` or `username` must be provided" };
        }

        const searchUrl = new URL("https://api.twitter.com/2/tweets/search/recent");
        searchUrl.searchParams.set("query", query);
        searchUrl.searchParams.set("max_results", String(Math.min(maxResults, 100)));
        searchUrl.searchParams.set("tweet.fields", "created_at,author_id,public_metrics");

        const resp = await ctx.http.fetch(searchUrl.toString(), { method: "GET", headers });
        if (!resp.ok) {
          return { error: `X search failed: HTTP ${resp.status}` };
        }

        const data = await resp.json();
        const tweets = (data && data.data) || [];

        const content = (tweets as any[])
          .map((t, i) => `${i + 1}. ${t.text}\nhttps://x.com/i/web/status/${t.id}\n${t.created_at ?? ""}`)
          .join("\n\n");

        return {
          content: content || `No results for query: "${query}"`,
          data: { mode: "search", query, resultCount: tweets.length, tweets },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: `X search failed: ${message}` };
      }
    },
  );
}

const plugin = definePlugin({
  async setup(ctx) {
    await registerToolHandlers(ctx);
    ctx.logger.info(`${PLUGIN_NAME} plugin setup complete`);
  },

  async onHealth() {
    return { status: "ok", message: "Web Search & Crawl plugin ready" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
